export function EnterpriseUnavailableNotice() {
  return (
    <section className="versionone-error" role="status">
      <strong>Live enterprise data is unavailable in the GitHub Pages build.</strong>
      <p>Run ShipCommand through the local integration server to use VersionOne or ServiceNow.</p>
    </section>
  );
}
