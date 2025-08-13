export default function AdminDashboard() {
  return (
    <div className="page-container">
      <h1>Panel de Administración</h1>
      <p>Solo visible para usuarios con rol <strong>ADMIN</strong>.</p>
    </div>
  );
}