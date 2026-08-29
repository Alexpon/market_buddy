// 抓取農業部開放資料，計算近 N 天各品項批發均價，輸出 prices.json
// 用法：node scripts/update_prices.mjs   （Node 18+，零依賴）
// 資料源：
//   蔬果：https://data.moa.gov.tw/api/v1/AgriProductsTransType/
//   漁產：https://data.moa.gov.tw/api/v1/AquaticTransData/
// 肉類無對應零售資料（拍賣為活體毛豬/家禽），維持前端內建基準。

import { writeFileSync } from "node:fs";

const DAYS = 30;
const OUT = new URL("../prices.json", import.meta.url).pathname;

// 前端品名 → 官方品名關鍵字（比對用 includes；多個關鍵字任一命中即納入）
// 官方名稱範例：「甘藍 初秋」「蕹菜 小葉」「香蕉」「吳郭魚(超低溫)」
const VEG_FRUIT = {
  "高麗菜":["甘藍"], "大白菜":["包心白"], "小白菜":["小白菜"], "青江菜":["青江白菜"],
  "空心菜":["蕹菜"], "菠菜":["菠菜"], "地瓜葉":["甘藷葉"], "A菜":["萵苣"],
  "芥藍":["芥藍"], "茼蒿":["茼蒿"], "韭菜":["韭菜"], "芹菜":["芹菜"],
  "龍鬚菜":["龍鬚菜","隼人瓜苗"], "白花椰菜":["花椰菜"], "青花菜":["青花苔","青花菜"],
  "牛番茄":["番茄 牛蕃茄","牛蕃茄","番茄 黑柿"], "小番茄":["番茄 小蕃茄","聖女","玉女"],
  "小黃瓜":["花胡瓜"], "大黃瓜":["胡瓜"], "苦瓜":["苦瓜"], "絲瓜":["絲瓜"],
  "冬瓜":["冬瓜"], "南瓜":["南瓜"], "茄子":["茄子"], "青椒":["青椒"],
  "彩色甜椒":["甜椒"], "四季豆":["敏豆"], "長豆":["豇豆"], "甜玉米":["食用玉米"],
  "綠竹筍":["綠竹筍"],
  "白蘿蔔":["蘿蔔"], "胡蘿蔔":["胡蘿蔔"], "馬鈴薯":["馬鈴薯"], "洋蔥":["洋蔥"],
  "青蔥":["青蔥"], "蒜頭":["蒜頭"], "老薑":["薑 老薑","老薑"], "辣椒":["辣椒"],
  "山藥":["山藥"], "地瓜":["甘藷 "], "芋頭":["芋 "],
  "香菇(鮮)":["香菇"], "杏鮑菇":["杏鮑菇"], "金針菇":["金針菇"],
  "香蕉":["香蕉"], "金鑽鳳梨":["鳳梨 金鑽"], "愛文芒果":["芒果 愛文"],
  "珍珠芭樂":["番石榴 珍珠"], "木瓜":["木瓜"], "大西瓜":["西瓜 大西瓜"],
  "洋香瓜":["洋香瓜"], "巨峰葡萄":["葡萄 巨峰"], "蓮霧":["蓮霧"],
  "釋迦":["釋迦"], "火龍果":["火龍果"], "荔枝":["荔枝"], "龍眼":["龍眼"],
  "柳丁":["柳橙"], "椪柑":["椪柑"], "茂谷柑":["茂谷柑"], "文旦柚":["文旦"],
  "甜柿":["柿 甜柿","甜柿"], "高接梨":["梨 "], "草莓":["草莓"],
  "蜜棗":["棗 "], "百香果":["百香果"], "酪梨":["酪梨"],
};
const FISH = {
  "台灣鯛":["吳郭魚"], "鯛魚片":["吳郭魚切片","鯛魚片"], "虱目魚":["虱目魚(養殖)","虱目魚"],
  "虱目魚肚":["虱目魚肚"], "白帶魚":["白帶魚"], "白鯧":["白鯧"], "金鯧":["金鯧","黃臘鰺"],
  "鱸魚":["金目鱸","七星鱸"], "石斑魚":["石斑"], "鯖魚":["花腹鯖","白腹鯖","鯖魚"],
  "秋刀魚":["秋刀"], "午仔魚":["午仔","四指馬鮁"], "肉魚":["肉魚","刺鯧"],
  "透抽":["鎖管","小卷","透抽"], "白蝦":["白蝦"], "文蛤":["文蛤"], "牡蠣":["牡蠣"],
};

const roc = d => `${d.getFullYear()-1911}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
const end = new Date();
const start = new Date(end); start.setDate(start.getDate()-DAYS);

const nameOf  = x => x.CropName || x.FishName || x["魚貨名稱"] || x["作物名稱"] || "";
const priceOf = x => +(x.Avg_Price ?? x.AvgPrice ?? x["平均價"] ?? 0);

async function fetchAll(base, extra=""){
  // api/v1 有分頁（Next/Page），逐頁抓到底；失敗自動重試一次
  const rows=[];
  for(let page=1;;page++){
    const url=`${base}?Start_time=${roc(start)}&End_time=${roc(end)}&Page=${page}${extra}`;
    let j;
    for(let t=0;t<2;t++){
      try{
        const r=await fetch(url,{headers:{accept:"application/json"}});
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        j=await r.json(); break;
      }catch(e){ if(t===1) throw e; await new Promise(s=>setTimeout(s,1500)); }
    }
    const data=j.Data||j.data||[];
    rows.push(...data);
    const hasNext = j.Next===true || j.next===true;
    if(!hasNext || !data.length || page>200) break;
    await new Promise(s=>setTimeout(s,300)); // 禮貌性間隔
  }
  return rows;
}

function aggregate(rows, mapping){
  const out={};
  for(const [display, keys] of Object.entries(mapping)){
    const hit=rows.filter(x=>{
      const n=nameOf(x); const p=priceOf(x);
      return p>0 && keys.some(k=>n.includes(k));
    });
    if(hit.length){
      const avg=hit.reduce((a,x)=>a+priceOf(x),0)/hit.length;
      out[display]={kg:+avg.toFixed(1), n:hit.length};
    }
  }
  return out;
}

console.log(`抓取 ${roc(start)} ~ ${roc(end)}（近 ${DAYS} 天）…`);
const items={};
try{
  const veg=await fetchAll("https://data.moa.gov.tw/api/v1/AgriProductsTransType/");
  console.log(`蔬果原始筆數：${veg.length}`);
  Object.assign(items, aggregate(veg, VEG_FRUIT));
}catch(e){ console.error("蔬果抓取失敗：", e.message); }
try{
  const fish=await fetchAll("https://data.moa.gov.tw/api/v1/AquaticTransData/");
  console.log(`漁產原始筆數：${fish.length}`);
  Object.assign(items, aggregate(fish, FISH));
}catch(e){ console.error("漁產抓取失敗：", e.message); }

if(!Object.keys(items).length){
  console.error("兩個資料源都沒抓到資料，不覆寫 prices.json");
  process.exit(1);
}
const payload={ updatedAt:new Date().toISOString(), days:DAYS, source:"data.moa.gov.tw", items };
writeFileSync(OUT, JSON.stringify(payload,null,1));
console.log(`完成：${Object.keys(items).length} 個品項 → prices.json`);
