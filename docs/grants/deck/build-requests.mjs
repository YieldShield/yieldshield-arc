/**
 * Native Google Slides revisions for the existing Arc grant deck.
 * This emits request JSON only. It does not authenticate, publish or submit a grant.
 * Apply once to presentation 1eq5wCaF0WdbLTRk8_ZTXjNXcX1A6Z0pzSqBLpis_ReQ.
 */
import { writeFileSync } from "node:fs";

const INK = "#193d31", MUTED = "#5f7468", ACCENT = "#ec674f", BG = "#f8faf6";
const rgb = (hex) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255,
  green: parseInt(hex.slice(3, 5), 16) / 255,
  blue: parseInt(hex.slice(5, 7), 16) / 255,
});
const requests = [];
function move(id, x, y, w, h) {
  // Imported shapes have a 3,000,000-EMU base size. Positions use design pixels.
  requests.push({ updatePageElementTransform: {
    objectId: id, applyMode: "ABSOLUTE",
    transform: { scaleX: w * 9525 / 3000000, scaleY: h * 9525 / 3000000,
      translateX: x * 9525, translateY: y * 9525, unit: "EMU" },
  } });
}
function text(id, value, x, y, w, h, px = 24, bold = false, color = INK) {
  // Each source shape is a single narrative style; reconstruct that style.
  requests.push({ deleteText: { objectId: id, textRange: { type: "ALL" } } });
  requests.push({ insertText: { objectId: id, insertionIndex: 0, text: value } });
  move(id, x, y, w, h);
  requests.push({ updateTextStyle: {
    objectId: id, textRange: { type: "ALL" },
    style: { fontFamily: "Arial", fontSize: { magnitude: px * .75, unit: "PT" },
      bold, foregroundColor: { opaqueColor: { rgbColor: rgb(color) } } },
    fields: "fontFamily,fontSize,bold,foregroundColor",
  } });
  requests.push({ updateParagraphStyle: {
    objectId: id, textRange: { type: "ALL" },
    style: { lineSpacing: 110, spaceAbove: { magnitude: 0, unit: "PT" },
      spaceBelow: { magnitude: 0, unit: "PT" } },
    fields: "lineSpacing,spaceAbove,spaceBelow",
  } });
}
function addText(id, slide, value, x, y, w, h, px=24, bold=false, color=INK) {
  requests.push({createShape: {objectId:id,shapeType:"TEXT_BOX",
    elementProperties:{pageObjectId:slide,size:{width:{magnitude:3000000,unit:"EMU"},height:{magnitude:3000000,unit:"EMU"}}}}});
  const emptyDelete = requests.length;
  text(id,value,x,y,w,h,px,bold,color);
  requests.splice(emptyDelete, 1);
}
function note(id, value) {
  requests.push({deleteText:{objectId:id,textRange:{type:"ALL"}}});
  requests.push({insertText:{objectId:id,insertionIndex:0,text:value}});
}

if (process.argv[2] === "team") {
  text("p7_i3", "The founders", 60, 110, 1160, 80, 46, true);
  text("p7_i4", "David Hawig", 270, 228, 340, 42, 30, true);
  text("p7_i5", "Founder and Managing Director\nFormer ecosystem director at Web3 Foundation\nFounded and exited two startups\nFull-time on YieldShield", 270, 285, 340, 210, 24, false, MUTED);
  text("p7_i6", "Santiago Balaguer", 870, 228, 340, 42, 30, true);
  text("p7_i7", "Cofounder and Product Lead\n15 years in product\n5 years in crypto\nBased in Berlin", 870, 285, 340, 210, 24, false, MUTED);
  text("p7_i8", "Hawig Ventures UG (haftungsbeschränkt), Germany", 60, 550, 1160, 42, 26, true);
  text("p7_i9", "Self-funded. No grants or investment received. Founders own the work and review AI-assisted development.", 60, 596, 1160, 56, 22, false, MUTED);
}

if (process.argv[2] === "story") {
  for (let i = 2; i <= 7; i++)
    text(`p${i}_i10`, "Arc testnet. Unaudited. Test tokens have no monetary value.", 60, 678, 1070, 25, 15, false, MUTED);
  text("p8_i6", "Arc testnet. Unaudited. Test tokens have no monetary value.", 60, 678, 1070, 25, 15, false, MUTED);
  text("p1_i10", "Circle Developer Grant / 20 October 2026", 60, 678, 1070, 25, 15, false, MUTED);
  // Cover: preserve native title and content elements, arrange as an editorial cover.
  text("p1_i3", "USDC-backed protection\nfor EURC and cirBTC", 60, 130, 800, 155, 55, true);
  text("p1_i4", "Built on Arc testnet", 60, 338, 760, 40, 28, true);
  text("p1_i5", "A fixed USDC claim, funded reserves and a choice of exits.", 60, 386, 730, 90, 30, false, MUTED);
  text("p1_i6", "Circle USDC powers the claim, reserve and gas", 60, 530, 750, 80, 26, false, MUTED);
  text("p1_i7", "arc.yieldshield.ai", 60, 612, 760, 40, 24, true);
  text("p1_i8", "$16,000", 900, 170, 320, 100, 57, true, ACCENT);
  text("p1_i9", "Grant request\n\n$11,000 core work\n$5,000 conditional\nmainnet release", 900, 290, 320, 250, 28, false, INK);

  // Problem: two sides of a funded risk transfer, with a specific first audience.
  text("p2_i3", "A choice for holders, a risk for providers", 60, 110, 1160, 90, 42, true);
  text("p2_i4", "Asset holders", 60, 245, 535, 45, 32, true);
  text("p2_i5", "Keep EUR or BTC exposure while setting a fixed exit value in USDC.\n\nConventional hedges can need active pricing and specialist execution.", 60, 308, 535, 200, 27, false, MUTED);
  text("p2_i6", "Capital providers", 675, 245, 535, 45, 32, true);
  text("p2_i7", "Commit USDC reserves to earn fees on realized gains.\n\nReceive the surrendered asset and bear its downside risk.", 675, 308, 535, 200, 27, false, MUTED);
  text("p2_i8", "First audience", 60, 555, 200, 40, 25, true);
  text("p2_i9", "Arc treasury, lending, wallet and agent builders in a controlled testnet pilot.", 290, 555, 920, 75, 25, false, MUTED);

  // Mechanism: entry at top, two exits underneath, maturity terms visible.
  text("p3_i3", "The protection lifecycle", 60, 110, 1160, 80, 44, true);
  text("p3_i4", "At entry", 60, 230, 240, 40, 28, true);
  text("p3_i5", "The oracle fixes the USDC claim. Providers reserve 150% of that amount.", 330, 230, 880, 90, 28, false, MUTED);
  text("p3_i6", "Keep the asset", 60, 360, 535, 45, 32, true);
  text("p3_i7", "Pay 12% of realized gain only.\n10% goes to providers, 1% to the creator and 1% to the protocol.", 60, 423, 535, 130, 27, false, MUTED);
  text("p3_i8", "Take the USDC claim", 675, 360, 535, 45, 32, true);
  text("p3_i9", "Surrender the asset for the fixed claim.\nProviders receive the asset and bear its loss.", 675, 423, 535, 130, 27, false, MUTED);
  addText("arc_maturity_note", "p3", "At maturity, anyone may settle. Remaining assets go to providers and holders claim USDC.", 60, 590, 1160, 60, 23, false, MUTED);

  // Circle stack: distinct assets with one shared settlement layer.
  text("p4_i3", "Circle integrations", 60, 110, 1160, 80, 44, true);
  text("p4_i4", "USDC", 60, 235, 340, 60, 48, true, ACCENT);
  text("p4_i5", "Reserves and claims\n6-decimal ERC-20 accounting\nGas on Arc", 60, 315, 340, 180, 27, false, MUTED);
  text("p4_i6", "EURC + cirBTC", 470, 235, 740, 60, 48, true);
  text("p4_i7", "Canonical Circle testnet assets\nEURC has 6 decimals. cirBTC has 8.\nChronicle prices EURC/USD against USDC/USD and CIRBTC/USDC.", 470, 315, 740, 180, 27, false, MUTED);
  text("p4_i8", "Grant work", 60, 555, 200, 40, 25, true);
  text("p4_i9", "App Kit Bridge exits to Ethereum Sepolia and Base Sepolia for both USDC and EURC. MCP tools prepare unsigned transactions.", 290, 550, 920, 100, 25, false, MUTED);

  // Evidence: numerical proof with explicit limits.
  text("p5_i3", "A working testnet foundation", 60, 110, 1160, 80, 44, true);
  text("p5_i4", "3 markets", 60, 230, 340, 85, 48, true, ACCENT);
  text("p5_i5", "EURC, cirBTC and a clearly labeled scenario market", 60, 330, 340, 140, 26, false, MUTED);
  text("p5_i6", "8 deployment txs", 470, 230, 740, 85, 45, true);
  text("p5_i7", "Runtime code checked against our build, plus asset identities, wiring, terms, seeds and receipts.\n\nA separate scripted-wallet journey exercised provision, protection, both exits and redemption.", 470, 330, 740, 210, 26, false, MUTED);
  text("p5_i8", "Current limits", 60, 565, 210, 40, 25, true);
  text("p5_i9", "Testnet only. No users or revenue. No browser-wallet signing claimed. Deployment checks and 72 Foundry tests are not an audit.", 290, 555, 920, 100, 24, false, MUTED);

  // Pilot content will be populated from the documented plan below.
  text("p6_i3", "A measurable testnet pilot", 60, 110, 1160, 80, 44, true);
  text("p6_i4", "Recruit", 60, 245, 340, 45, 32, true);
  text("p6_i5", "Invite 20 treasury, lending and agent builders through developer communities and our network.\nConduct five interviews.", 60, 310, 340, 210, 26, false, MUTED);
  text("p6_i6", "10 testers", 470, 245, 340, 45, 32, true, ACCENT);
  text("p6_i7", "Own wallets and faucet tokens.\n30 completed journeys covering both exits, provider claims and maturity settlement.", 470, 310, 340, 210, 26, false, MUTED);
  text("p6_i8", "Measure", 880, 245, 330, 45, 32, true);
  text("p6_i9", "8 of 10 complete a core flow without live help.\nSeek two follow-on integration expressions of interest.", 880, 310, 330, 210, 26, false, MUTED);
  addText("arc_pilot_note", "p6", "Future targets. No users or commitments yet. Publish results and fixes. Protocol revenue model: 1% of realized gain.", 60, 575, 1160, 75, 23, false, MUTED);

  // Keep the milestone slide's existing title and replace its rasterized table
  // with a native table so reviewers can edit or copy the figures.
  text("p8_i3", "$16,000 across four milestones", 60, 110, 1160, 80, 44, true);
  requests.push({deleteObject:{objectId:"p8_i4"}});
  requests.push({createTable:{objectId:"arc_milestone_table",rows:5,columns:4,
    elementProperties:{pageObjectId:"p8",size:{width:{magnitude:870,unit:"PT"},height:{magnitude:255,unit:"PT"}},
    transform:{scaleX:1,scaleY:1,translateX:45,translateY:172.5,unit:"PT"}}}});
  const rows = [
    ["Deliverable","Acceptance / target","Hours","Budget"],
    ["CCTP + App Kit exits","4 routes, receipts + recovery\nWeek 3", "35","$3,500"],
    ["MCP + agent identity","Unsigned tools + wallet session\nWeek 6","45","$4,500"],
    ["Pilot + hardening","10 testers, 30 journeys\nWeek 9","30","$3,000"],
    ["Capped mainnet release","After audit + legal review","50","$5,000"],
  ];
  for(let r=0;r<rows.length;r++) for(let c=0;c<4;c++){
    const cellLocation={rowIndex:r,columnIndex:c};
    requests.push({insertText:{objectId:"arc_milestone_table",cellLocation,text:rows[r][c],insertionIndex:0}});
    requests.push({updateTextStyle:{objectId:"arc_milestone_table",cellLocation,textRange:{type:"ALL"},
      style:{fontFamily:"Arial",fontSize:{magnitude:17,unit:"PT"},bold:r===0,
        foregroundColor:{opaqueColor:{rgbColor:rgb(r===0?"#ffffff":INK)}}},
      fields:"fontFamily,fontSize,bold,foregroundColor"}});
    requests.push({updateTableCellProperties:{objectId:"arc_milestone_table",
      tableRange:{location:{rowIndex:r,columnIndex:c},rowSpan:1,columnSpan:1},
      tableCellProperties:{tableCellBackgroundFill:{solidFill:{color:{rgbColor:rgb(r===0?INK:BG)}}},
        contentAlignment:"MIDDLE"},fields:"tableCellBackgroundFill,contentAlignment"}});
  }
  [340,310,90,130].forEach((width,i)=>requests.push({updateTableColumnProperties:{objectId:"arc_milestone_table",columnIndices:[i],tableColumnProperties:{columnWidth:{magnitude:width,unit:"PT"}},fields:"columnWidth"}}));
  text("p8_i5", "$11,000 core work. The $5,000 mainnet milestone needs a separately funded audit and legal review. Existing work is not billed.", 60, 600, 1160, 65, 23, false, MUTED);
  const shared = "Sources: https://arc.yieldshield.ai and https://github.com/YieldShield/yieldshield-arc. Testnet only and unaudited. No external users, commercial revenue, grants or investment received. Grant funding is chain-specific and excludes existing/shared core work.";
  for (let i=1;i<=8;i++) note(`p${i}:notes_i3`, shared);
  note("p3:notes_i3", shared + "\nMechanism: ShieldPool.sol. A holder's claim is fixed at entry; provider capital reserves 150%. Before maturity, holders may retrieve assets less gain fees or surrender them for USDC. At maturity, permissionless settlement transfers remaining assets to providers and records the owner's pull claim. Providers bear downside. Contract, oracle, token and execution risks remain.");
  note("p4:notes_i3", shared + "\nCCTP route research: docs/grants/CCTP_ROUTE_VALIDATION_2026-10-20.md. Planned routes are Arc Testnet domain 26 to Ethereum Sepolia domain 0 and Base Sepolia domain 6, for USDC and EURC. USDC uses TokenMessengerV2.depositForBurn. EURC uses CCTP non-USDC CrossChainTokenService.crossChainTransfer and per-token TokenManager approval. App Kit Bridge routes both. Read-only registry and bilateral trust configuration checks are complete; actual integration and transfer receipts remain future grant work. Source: https://developers.circle.com/cctp/concepts/supported-chains-and-domains");
  note("p5:notes_i3", shared + "\nDeployment verification means runtime code compared with the local build (immutable slots masked), asset identities, wiring, terms and recorded receipts checked. This does not claim explorer-published source verification or an audit. The 8-transaction scripted journey used our own test wallet, not external users. Browser-wallet signing remains unclaimed.");
  note("p6:notes_i3", shared + "\nPilot source: docs/grants/ARC_PILOT_PLAN.md. David owns recruitment and technical support; Santiago owns interviews and usability analysis. Target 10 testers from at least three independent teams, 30 journeys, 8/10 completing a core journey without live founder help, and two follow-on integration expressions of interest. Recruitment and interviews outside the 30-hour milestone engineering allowance are founder-funded. All numbers are targets, not traction or partnerships.");
  note("p7:notes_i3", shared + "\nPortraits: YieldShield_V0.13_Robinhood.pptx, slide 13, Team/Partnerships, https://docs.google.com/presentation/d/1s74o5XRnIDTBbQAaa99iY1M_tRgiG3Ow/edit . Original image26.png (rId3) is above David Hawig's name. Original image18.png (rId4) is above Santiago Balaguer's name. Photos retain their square proportions without face editing. Founder locations and roles were confirmed for the current application.");
  note("p8:notes_i3", shared + "\nMilestone 1 requires four testnet transfers: each token (USDC and EURC) to each destination (Ethereum Sepolia and Base Sepolia), with source transaction, attestation, destination mint, recipient balance delta and recovery evidence. M2 records unsigned agent preparation followed by a person signing in MetaMask, plus ERC-8004 identity. M3 includes invariants, threat model, monitoring and external pilot. M4 is conditional on an independent audit and legal review funded outside this grant; otherwise it remains blocked or requires an agreed scope change. No mainnet safety claim is implied.");
  requests.push({updateTextStyle:{objectId:"p1_i7",textRange:{type:"ALL"},style:{link:{url:"https://arc.yieldshield.ai"}},fields:"link"}});
  for (const [id,name] of [["arc_david_portrait","David Hawig"],["arc_santiago_portrait","Santiago Balaguer"]])
    requests.push({updatePageElementAltText:{objectId:id,title:name,description:"Founder portrait reused from the labeled team slide in YieldShield V0.13 Robinhood."}});
}

const out = process.argv[3];
if (!out) throw new Error("Usage: node build-requests.mjs team|story output.json");
writeFileSync(out, JSON.stringify(requests, null, 2) + "\n");
