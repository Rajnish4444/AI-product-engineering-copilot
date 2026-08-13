async function main() {
  const started = Date.now();
  const res = await fetch("http://localhost:3000/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idea: "Add dark mode to settings" }),
  });

  console.log(`status: ${res.status}  time-to-headers: ${Date.now() - started}ms`);

  if (!res.body) {
    console.log("no body");
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let count = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!line) continue;
      count++;
      const parsed = JSON.parse(line);
      const preview =
        parsed.type === "prd.partial" || parsed.type === "tasks.partial"
          ? `${parsed.type} (${Object.keys(parsed.data ?? {}).length} keys)`
          : `${parsed.type} ${JSON.stringify(parsed).slice(0, 140)}`;
      console.log(`[${count} @ ${Date.now() - started}ms] ${preview}`);
      if (count >= 12) {
        console.log("(truncating)");
        return;
      }
    }
  }
  console.log(`done. total events: ${count}`);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
