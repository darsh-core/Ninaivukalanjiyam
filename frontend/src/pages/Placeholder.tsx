// Temporary stand-in used until each route's real page lands (Tasks 6-12).
export function Placeholder({ name }: { name: string }) {
  return (
    <section style={{ padding: '24px 0' }}>
      <h1>{name}</h1>
    </section>
  );
}
