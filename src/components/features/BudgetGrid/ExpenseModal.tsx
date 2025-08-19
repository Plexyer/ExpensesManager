import { Dialog } from "@headlessui/react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

function ExpenseModal({ open, onClose }: Props) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-xl shadow-secure max-h-screen overflow-y-auto">
          <div className="border-b border-slate-200 p-6 pb-4">
            <Dialog.Title className="text-lg font-semibold">Add Expense</Dialog.Title>
          </div>
          <div className="p-6 space-y-3">
            <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <input className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 w-full" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2 justify-end pt-2">
              <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200" onClick={onClose}>Cancel</button>
              <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm active:scale-95" onClick={onClose}>Save</button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ExpenseModal;


