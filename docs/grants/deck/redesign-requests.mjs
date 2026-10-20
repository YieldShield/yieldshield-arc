/**
 * One-time visual redesign of the existing native Arc grant deck.
 * Usage: node redesign-requests.mjs raw-source.json output-directory
 * Emits separate cover, diagram and screenshot requests. No authentication.
 */
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {join} from "node:path";
const [input, out] = process.argv.slice(2);
const source = JSON.parse(readFileSync(input, "utf8")).structuredContent;
mkdirSync(out, {recursive:true});
const C = {ink:"#12372c", green:"#285e49", muted:"#597367", paper:"#f6f5ef",
  white:"#ffffff", coral:"#ed765e", sage:"#a9c5b1", pale:"#e3e9df", line:"#b5c5b9"};
const rgb = h => ({red:parseInt(h.slice(1,3),16)/255,green:parseInt(h.slice(3,5),16)/255,blue:parseInt(h.slice(5,7),16)/255});
const color = h => ({rgbColor:rgb(h)});
const prop = (slide,x,y,w,h) => ({pageObjectId:slide,size:{width:{magnitude:w,unit:"PT"},height:{magnitude:h,unit:"PT"}},
  transform:{scaleX:1,scaleY:1,translateX:x,translateY:y,unit:"PT"}});
let requests=[], serial=0, slide="";
const uid = stem => `arc26_${slide}_${stem}_${++serial}`;
function text(value,x,y,w,h,size=20,fill=C.ink,bold=false,align="START",id=uid("t")){
  requests.push({createShape:{objectId:id,shapeType:"TEXT_BOX",elementProperties:prop(slide,x,y,w,h)}});
  requests.push({insertText:{objectId:id,text:value,insertionIndex:0}});
  requests.push({updateTextStyle:{objectId:id,textRange:{type:"ALL"},style:{
    fontFamily:"Manrope",fontSize:{magnitude:size,unit:"PT"},bold,foregroundColor:{opaqueColor:color(fill)}
  },fields:"fontFamily,fontSize,bold,foregroundColor"}});
  requests.push({updateParagraphStyle:{objectId:id,textRange:{type:"ALL"},style:{
    alignment:align,lineSpacing:110,spaceAbove:{magnitude:0,unit:"PT"},spaceBelow:{magnitude:0,unit:"PT"},
  },fields:"alignment,lineSpacing,spaceAbove,spaceBelow"}});
  requests.push({updateShapeProperties:{objectId:id,shapeProperties:{
    outline:{propertyState:"NOT_RENDERED"},shapeBackgroundFill:{propertyState:"NOT_RENDERED"},contentAlignment:"TOP",
  },fields:"outline,shapeBackgroundFill,contentAlignment"}});
  return id;
}
function box(x,y,w,h,fill,stroke=null,kind="RECTANGLE",id=uid("node")){
  requests.push({createShape:{objectId:id,shapeType:kind,elementProperties:prop(slide,x,y,w,h)}});
  requests.push({updateShapeProperties:{objectId:id,shapeProperties:{
    shapeBackgroundFill:{solidFill:{color:color(fill),alpha:1}},
    outline:stroke?{solidFill:{color:color(stroke),alpha:1},weight:{magnitude:1.2,unit:"PT"},dashStyle:"SOLID"}:{propertyState:"NOT_RENDERED"},
  },fields:"shapeBackgroundFill,outline"}});
  return id;
}
function line(x1,y1,x2,y2,fill=C.ink,width=2,arrow=false,dash=false){
  const id=uid("line");
  requests.push({createLine:{objectId:id,category:"STRAIGHT",elementProperties:{
    pageObjectId:slide,size:{width:{magnitude:Math.max(Math.abs(x2-x1),.01),unit:"PT"},height:{magnitude:Math.max(Math.abs(y2-y1),.01),unit:"PT"}},
    transform:{scaleX:x2<x1?-1:1,scaleY:y2<y1?-1:1,translateX:x1,translateY:y1,unit:"PT"}
  }}});
  requests.push({updateLineProperties:{objectId:id,lineProperties:{
    lineFill:{solidFill:{color:color(fill),alpha:1}},weight:{magnitude:width,unit:"PT"},
    endArrow:arrow?"FILL_ARROW":"NONE",dashStyle:dash?"DASH":"SOLID",
  },fields:"lineFill,weight,endArrow,dashStyle"}});
}
function note(s,body){
  const n=source.slides.find(p=>p.objectId===s)?.slideProperties?.notesPage?.notesProperties?.speakerNotesObjectId;
  if(n){requests.push({deleteText:{objectId:n,textRange:{type:"ALL"}}},{insertText:{objectId:n,text:body,insertionIndex:0}});}
}
function reset(s,{dark=false,keep=[]}={}){
  slide=s;
  for(const el of source.slides.find(p=>p.objectId===s).pageElements)
    if(!keep.includes(el.objectId)) requests.push({deleteObject:{objectId:el.objectId}});
  requests.push({updatePageProperties:{objectId:s,pageProperties:{pageBackgroundFill:{solidFill:{color:color(dark?C.ink:C.paper),alpha:1}}},fields:"pageBackgroundFill"}});
}
function head(title,num,dark=false){
  const fg=dark?C.paper:C.ink, muted=dark?C.sage:C.muted;
  text("YieldShield Arc",48,22,450,22,11,muted,true);
  text(title,48,63,870,96,36,fg,true);
  text(String(num).padStart(2,"0"),874,507,38,20,11,muted,false,"END");
}
function foot(value,dark=false){text(value,48,502,800,28,11,dark?C.sage:C.muted);}
function node(label,x,y,w,h,{fill=C.pale,fg=C.ink,size=23}={}){
  box(x,y,w,h,fill);
  text(label,x+12,y+15,w-24,h-20,size,fg,true,"CENTER");
}
function save(name){writeFileSync(join(out,name+".json"),JSON.stringify(requests,null,2));requests=[];}
const assetRoot="/Users/david/Documents/source/yieldshield/arc/docs/grants/deck/assets";

// A true, minimal title slide. Generated art is background only; all copy is editable.
slide="arc_title_20261020";
requests.push({createSlide:{objectId:slide,insertionIndex:0,slideLayoutReference:{predefinedLayout:"BLANK"}}});
requests.push({createImage:{objectId:"arc26_cover_art",url:join(assetRoot,"arc-cover.png"),elementProperties:prop(slide,0,-.14,960,540.29)}});
requests.push({updatePageElementAltText:{objectId:"arc26_cover_art",title:"Protection concept",description:"Conceptual arch sheltering two discs on a funded base. Decorative illustration, not a diagram or product screenshot."}});
text("YieldShield",48,42,440,45,22,C.paper,true);
text("Arc",44,148,490,118,88,C.paper,true);
text("USDC-backed protection\nfor EURC and cirBTC",48,295,440,95,25,C.paper);
text("Circle Developer Grant\n20 October 2026",48,445,440,54,13,C.sage);
save("01-cover");

// Preserve the 8 original page identities, replace their text-only compositions.
reset("p1");head("A fixed exit value in USDC",2);
text("Holders keep exposure to EUR or BTC.\nThey choose when to return to USDC.",48,165,420,90,23,C.muted);
node("EURC or cirBTC",530,167,330,65,{fill:C.ink,fg:C.paper});
line(695,232,695,280,C.ink,2);
line(580,280,810,280,C.ink,2);
line(580,280,580,325,C.ink,2,true);line(810,280,810,325,C.ink,2,true);
text("Asset exposure",485,341,195,65,23,C.ink,true,"CENTER");
text("Fixed USDC claim",705,341,210,65,23,C.ink,true,"CENTER");
text("Keep upside",485,405,195,38,17,C.muted,false,"CENTER");
text("Choose a funded exit",705,405,210,50,17,C.muted,false,"CENTER");
text("Initial audience",48,326,400,35,17,C.ink,true);
text("Arc treasury, lending,\nwallet and agent builders",48,369,400,88,23,C.muted);
foot("Arc testnet. Unaudited. Test tokens have no monetary value.");
note("p1","Source: saved Circle application, problem and solution fields, 20 October 2026. Claim is fixed in USDC at entry. This does not preserve EUR purchasing power or eliminate protocol, oracle or stablecoin risk. Pilot audience is proposed, not existing traction.");

reset("p2");head("The reserve model",3);
node("Asset holder",48,178,225,65,{fill:C.ink,fg:C.paper});
node("YieldShield pool",367,178,225,65,{fill:C.green,fg:C.paper});
node("Capital provider",686,178,225,65,{fill:C.ink,fg:C.paper});
line(273,210,355,210,C.green,2.5,true);line(686,210,604,210,C.coral,2.5,true);
text("EURC / cirBTC",270,151,100,27,12,C.muted,false,"CENTER");
text("USDC",596,151,86,27,12,C.muted,false,"CENTER");
text("Fixed claim",48,279,230,35,23,C.ink,true);
text("Value set at entry\nby the oracle",48,326,230,72,20,C.muted);
text("150%",367,280,235,78,60,C.coral,true,"CENTER");
text("USDC reserved per claim",343,367,274,48,19,C.muted,false,"CENTER");
text("Risk + reward",686,279,225,35,23,C.ink,true);
text("Earn gain fees\nReceive surrendered assets\nBear their downside",686,326,230,105,19,C.muted);
line(48,455,912,455,C.line,1);
text("Illustration: a 100 USDC claim requires 150 USDC of backing at entry.",48,462,850,32,17,C.ink);
foot("Reserve requirement does not replace an independent audit.");
note("p2","Source: contracts/src/ShieldPool.sol, protect/_protect and requiredBacking; config/deployment.json. Illustrative 100/150 USDC values explain the deployed 150% collateral requirement, not current market balances. Capital providers bear asset losses. No return is promised.");

reset("p3",{dark:true});head("Two exits before maturity",4,true);
node("Protected position",336,154,288,59,{fill:C.paper,fg:C.ink,size:22});
line(480,213,480,245,C.sage,2);
line(249,245,711,245,C.sage,2);line(249,245,249,278,C.sage,2,true);line(711,245,711,278,C.sage,2,true);
text("Keep the asset",48,292,402,47,30,C.paper,true,"CENTER");
text("Take the USDC claim",510,292,402,47,30,C.paper,true,"CENTER");
text("Pay 12% of realized gain only",48,351,402,35,19,C.sage,false,"CENTER");
text("Surrender the asset for the fixed claim",505,351,410,58,19,C.sage,false,"CENTER");
text("10% provider   1% creator   1% protocol",48,400,402,35,15,C.coral,false,"CENTER");
text("No price read needed for this exit",510,415,402,30,17,C.coral,false,"CENTER");
foot("At maturity: anyone can settle; holders claim USDC and providers receive remaining assets.",true);
note("p3","Source: ShieldPool.sol, exitAsset/partialExitAsset, exitBacking/partialExitBacking, settleExpired and claimBacking. Asset exits need a valid current price. Backing exits do not require a fresh price. Fee split is 10/1/1 percent of positive realized gain. Terms are for the featured deployment.");

reset("p4");head("Built on Circle assets and Arc",5);
// Current architecture on the left; planned bridge routes on the right.
text("WORKING TODAY",48,154,360,25,12,C.muted,true);
box(48,192,475,255,C.pale);
text("Arc testnet",68,205,430,33,22,C.ink,true);
node("EURC",78,265,124,57,{fill:C.paper,size:20});
node("cirBTC",224,265,124,57,{fill:C.paper,size:20});
node("USDC",370,265,124,57,{fill:C.ink,fg:C.paper,size:20});
text("Protected assets",78,336,270,35,17,C.muted,false,"CENTER");
text("Reserve + gas",357,336,150,35,17,C.muted,false,"CENTER");
line(118,388,453,388,C.green,2);
text("Chronicle price references",78,403,420,35,18,C.ink,true,"CENTER");
text("PROPOSED GRANT WORK",585,154,325,25,12,C.muted,true);
node("App Kit Bridge",585,192,327,60,{fill:C.ink,fg:C.paper,size:23});
line(748,252,748,286,C.green,2);
line(660,286,837,286,C.green,2);
line(660,286,660,315,C.green,2,true,true);line(837,286,837,315,C.green,2,true,true);
text("Ethereum\nSepolia",574,331,170,67,21,C.ink,true,"CENTER");
text("Base\nSepolia",751,331,170,67,21,C.ink,true,"CENTER");
text("USDC + EURC to both destinations",576,411,342,55,17,C.muted,false,"CENTER");
foot("Planned bridges run separately after an exit or claim. Pools remain on a single chain.");
note("p4","Current assets and oracle: config/deployment.json and ShieldOracles.sol. USDC uses its 6-decimal ERC-20 interface for accounting and also pays native gas on Arc; EURC has 6 decimals, cirBTC 8. Planned: Arc domain26 to Ethereum Sepolia0 and Base Sepolia6. USDC uses TokenMessengerV2.depositForBurn. EURC uses CrossChainTokenService.crossChainTransfer after TokenManager approval. Sources: docs/grants/CCTP_ROUTE_VALIDATION_2026-10-20.md; https://developers.circle.com/cctp/expanded-assets/concepts/cctp-differences ; https://docs.arc.io/app-kit/bridge . These integrations are future milestones.");

reset("p5",{dark:true});head("The deployed testnet product",6,true);
// Actual screenshot is added separately at x48,y170,w570,h285.
text("3",680,160,200,78,58,C.coral,true);
text("working markets",684,235,215,36,18,C.paper);
text("72",680,293,200,78,58,C.paper,true);
text("contract tests passed",684,370,215,48,18,C.sage);
text("arc.yieldshield.ai",48,463,570,31,19,C.paper,true);
foot("Project-controlled test wallets. No external users or revenue. Tests are not an audit.",true);
note("p5","Source: docs/E2E_REPORT_2026-10-20.md, deployed site and config/deployment.json. Screenshot captured from the live markets page on20Oct2026, no wallet connected. Three markets: EURC reference, cirBTC reference, EURC scenario. 72 contract tests,31unit checks,12browser scenarios across runs,8confirmed Arc journey transactions. Runtime/config/receipt checks are not an audit or explorer source verification. No external adoption claimed.");

reset("p6");head("A pilot with measurable outcomes",7);
const xs=[48,366,684];
["20","10","30"].forEach((n,i)=>text(n,xs[i],165,224,88,64,i===1?C.coral:C.ink,true));
["invitations","external testers","complete journeys"].forEach((n,i)=>text(n,xs[i]+4,260,240,38,21,C.ink,true));
line(273,222,339,222,C.line,2,true);line(591,222,657,222,C.line,2,true);
text("Five discovery interviews",48,312,270,50,17,C.muted);
text("At least three teams",370,312,270,50,17,C.muted);
text("Both exits, maturity\nand provider claims",688,312,230,65,17,C.muted);
line(48,402,912,402,C.line,1);
text("8 / 10",48,420,190,58,38,C.green,true);
text("Target: complete a core flow without live help.\nPublish failures and fixes, then seek follow-on integrations.",245,425,670,60,18,C.muted);
foot("Future targets. No tester or partnership commitments claimed.");
note("p6","Source: docs/grants/ARC_PILOT_PLAN.md and saved application milestone3.30journeys:10assetexits,10USDCbackingexits,5maturitysettlements/claims,5providerjourneys.20invitations,5interviews,10externaltestersfrom>=3teams.8/10independentcompletiontarget.Twofollow-onexpressionsofinterestarealearningtarget.Recruitmentandordinarysupportbeyond30engineeringhoursareself-funded.");

reset("p7",{keep:["arc_david_portrait","arc_santiago_portrait"]});head("The founders",8);
function portrait(id,x,y,side){
  const old=source.slides.find(s=>s.objectId==="p7").pageElements.find(e=>e.objectId===id);
  const sw=old.size.width.magnitude, sh=old.size.height.magnitude;
  const unit=old.size.width.unit, unitPt=unit==="EMU"?1/12700:1;
  requests.push({updatePageElementTransform:{objectId:id,applyMode:"ABSOLUTE",transform:{
    scaleX:side/(sw*unitPt),scaleY:side/(sh*unitPt),translateX:x,translateY:y,unit:"PT"
  }}});
}
portrait("arc_david_portrait",55,155,195);portrait("arc_santiago_portrait",505,155,195);
text("David Hawig",265,166,220,76,29,C.ink,true);
text("Founder\nManaging Director",265,246,220,64,17,C.green);
text("Santiago\nBalaguer",715,166,220,76,29,C.ink,true);
text("Cofounder\nProduct Lead",715,246,220,64,17,C.green);
text("Former Web3 Foundation ecosystem director\nFounded and exited two startups",48,380,430,75,19,C.muted);
text("15 years in product\n5 years in crypto",505,380,405,75,19,C.muted);
foot("Hawig Ventures UG, Germany. Self-funded. No grants or investment received.");
note("p7","Photos: existing Drive presentation YieldShield_V0.13_Robinhood.pptx, slide13 Team/Partnerships, file1s74o5XRnIDTBbQAaa99iY1M_tRgiG3Ow. Original images unchanged. Bios supplied in the saved Circle application. David full-time on YieldShield, Santiago based in Berlin. Founders own the work and review AI-assisted development.");

reset("p8",{dark:true,keep:["arc_milestone_table"]});head("$16,000 across four milestones",9,true);
text("$11,000 core work",48,153,500,47,28,C.paper,true);
text("$5,000 conditional mainnet",537,153,375,62,24,C.coral,true);
const table="arc_milestone_table";
requests.push({updatePageElementTransform:{objectId:table,applyMode:"ABSOLUTE",transform:{
  scaleX:1,scaleY:1,translateX:48,translateY:230,unit:"PT"
}}});
const rows=[
  ["Deliverable","Acceptance / target","Hours","Budget"],
  ["Bridge exits","4 transfers + recovery / week 3","35","$3,500"],
  ["Agent integration","Unsigned tools / week 6","45","$4,500"],
  ["Pilot + hardening","10 testers, 30 journeys / week 9","30","$3,000"],
  ["Capped mainnet","After audit + legal review","50","$5,000"],
];
for(let r=0;r<5;r++)for(let c=0;c<4;c++){
  const loc={rowIndex:r,columnIndex:c};
  requests.push({deleteText:{objectId:table,cellLocation:loc,textRange:{type:"ALL"}}},
    {insertText:{objectId:table,cellLocation:loc,insertionIndex:0,text:rows[r][c]}},
    {updateTextStyle:{objectId:table,cellLocation:loc,textRange:{type:"ALL"},style:{
      fontFamily:"Manrope",fontSize:{magnitude:r===0?13:16,unit:"PT"},bold:c===3||r===0,
      foregroundColor:{opaqueColor:color(r===4?C.coral:r===0?C.sage:C.paper)}
    },fields:"fontFamily,fontSize,bold,foregroundColor"}},
    {updateParagraphStyle:{objectId:table,cellLocation:loc,textRange:{type:"ALL"},style:{
      lineSpacing:100,spaceAbove:{magnitude:0,unit:"PT"},spaceBelow:{magnitude:0,unit:"PT"}
    },fields:"lineSpacing,spaceAbove,spaceBelow"}},
    {updateTableCellProperties:{objectId:table,tableRange:{location:loc,rowSpan:1,columnSpan:1},
      tableCellProperties:{tableCellBackgroundFill:{solidFill:{color:color(C.ink),alpha:1}},contentAlignment:"MIDDLE"},
      fields:"tableCellBackgroundFill,contentAlignment"}});
}
requests.push({updateTableColumnProperties:{objectId:table,columnIndices:[0],tableColumnProperties:{columnWidth:{magnitude:235,unit:"PT"}},fields:"columnWidth"}},
  {updateTableColumnProperties:{objectId:table,columnIndices:[1],tableColumnProperties:{columnWidth:{magnitude:425,unit:"PT"}},fields:"columnWidth"}},
  {updateTableColumnProperties:{objectId:table,columnIndices:[2],tableColumnProperties:{columnWidth:{magnitude:76,unit:"PT"}},fields:"columnWidth"}},
  {updateTableColumnProperties:{objectId:table,columnIndices:[3],tableColumnProperties:{columnWidth:{magnitude:128,unit:"PT"}},fields:"columnWidth"}},
  {updateTableRowProperties:{objectId:table,rowIndices:[0,1,2,3,4],tableRowProperties:{minRowHeight:{magnitude:38,unit:"PT"}},fields:"minRowHeight"}},
  {updateTableBorderProperties:{objectId:table,tableRange:{location:{rowIndex:0,columnIndex:0},rowSpan:5,columnSpan:4},borderPosition:"ALL",
    tableBorderProperties:{tableBorderFill:{solidFill:{color:color(C.green),alpha:1}},weight:{magnitude:.6,unit:"PT"},dashStyle:"SOLID"},
    fields:"tableBorderFill,weight,dashStyle"}});
foot("Mainnet requires a separately funded independent audit and legal review. Existing work is not billed.",true);
note("p8","Source: saved Circle grant milestones.160hours total at$100/hour. M1 35h/$3500, M2 45h/$4500, M3 30h/$3000, M4 50h/$5000. Targets3/6/9weeks afteracceptance. M4 estimatedQ12027onlyafterindependentauditandlegalreviewoutsidegrant. Protocolrevenue:1%ofrealizedgain, noyieldpromises. No incentives/liquiditymining/token.");
save("02-diagrams");

slide="p5";
const screenshot=join(assetRoot,"markets-live-2026-10-20.png");
requests.push({createImage:{objectId:"arc26_live_markets",url:screenshot,
  elementProperties:prop(slide,48,168,570,570*1260/2545)}},
  {updatePageElementAltText:{objectId:"arc26_live_markets",title:"Live Arc markets",description:"Unedited screenshot of the deployed markets page,20October2026,showing the three testnet markets."}});
save("03-screenshot");
