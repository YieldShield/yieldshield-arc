import { config } from "./chain";
import { PageTitle, Facts } from "./ui";
import { buildAgentManifest } from "./agent-manifest.mjs";
/** Human-readable view of the machine-readable agent surface served at /agent.json and /llms.txt. */
export function Agents() {
  const manifest = buildAgentManifest(config);
  return (
    <>
      <PageTitle
        eyebrow="FOR AI AGENTS"
        title="Read the markets. Never sign."
        description="A static manifest lets agents discover markets, check terms and price freshness, and prepare unsigned transactions for a person's own wallet."
      />
      <div className="market-grid">
        <section className="market-card">
          <h2>Machine-readable files</h2>
          <Facts
            items={[
              [
                "Manifest",
                <a href="/agent.json" key="manifest">
                  /agent.json
                </a>,
              ],
              [
                "Plain-text guide",
                <a href="/llms.txt" key="llms">
                  /llms.txt
                </a>,
              ],
              [
                "Contract ABIs",
                <a href="/abi/ShieldPool.json" key="abi">
                  /abi/ShieldPool.json
                </a>,
              ],
              ["Schema", manifest.schema],
              ["Deployment status", manifest.status.deployment],
              [
                "Writes enabled",
                manifest.status.writesEnabled ? "Yes (Arc testnet)" : "No",
              ],
            ]}
          />
        </section>
        <section className="market-card">
          <h2>Agent rules</h2>
          <ul className="plain-list">
            <li>Never sign, broadcast or hold keys.</li>
            <li>
              Output unsigned transactions with value 0 on chain{" "}
              {manifest.network.chainId}.
            </li>
            <li>Refuse stale prices; never use the scenario price as a reference.</li>
            <li>Simulate every call from the user&apos;s address first.</li>
            <li>Testnet only: test tokens have no monetary value.</li>
          </ul>
        </section>
      </div>
      <div className="field-note">
        <h2>Safety checks before preparing a transaction</h2>
        <ol className="plain-list">
          {manifest.safetyChecks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ol>
        <h2>Price freshness</h2>
        <ul className="plain-list">
          {manifest.oracleFreshnessRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <h2>Unsigned transaction recipes</h2>
        <ul className="plain-list">
          {manifest.unsignedTransactions.recipes.map((recipe) => (
            <li key={recipe.intent}>
              <b>{recipe.intent}</b>: {recipe.steps.join(" → ")}
            </li>
          ))}
        </ul>
        <h2>Next: MCP tools</h2>
        <p>{manifest.roadmap.mcp}</p>
      </div>
    </>
  );
}
