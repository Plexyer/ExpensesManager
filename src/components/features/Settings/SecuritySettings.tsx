import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function SecuritySettings() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function onVerify() {
    try {
      const ok = await invoke<boolean>("verify_master_password", {
        args: { username, master_password: password },
      } as any);
      setResult(ok ? "Password OK" : "Invalid password or user");
    } catch (e: any) {
      setResult(e?.toString?.() ?? "Error");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Security</h2>
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6 w-full max-w-md">
        <label className="text-sm font-medium text-slate-700 mb-1 block">Username</label>
        <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="text-sm font-medium text-slate-700 mb-1 block mt-3">Master password</label>
        <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full" type="password" placeholder="Master password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="mt-4 flex gap-2">
          <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm active:scale-95" onClick={onVerify}>Verify</button>
        </div>
        {result && <p className="mt-3 text-sm text-slate-700">{result}</p>}
      </div>
    </div>
  );
}

export default SecuritySettings;


