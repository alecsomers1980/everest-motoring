"use client";
import { useState } from "react";
import { updateProfileDetails, updatePassword } from "./actions";

export default function ProfileForm({ initial }) {
  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [busyDetails, setBusyDetails] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  const [messageDetails, setMessageDetails] = useState(null);
  const [messagePassword, setMessagePassword] = useState(null);

  const len = password.length >= 8;
  const upper = /[A-Z]/.test(password);
  const lower = /[a-z]/.test(password);
  const match = password.length > 0 && password === confirm;
  const passwordValid = len && upper && lower && match;

  const handleSaveDetails = async () => {
    setBusyDetails(true);
    setMessageDetails(null);
    try {
      const res = await updateProfileDetails({ firstName, lastName, phone, email });
      if (res.error) {
        setMessageDetails({ type: "error", text: res.error });
      } else {
        setMessageDetails({ type: "success", text: "Details saved." });
      }
    } catch {
      setMessageDetails({ type: "error", text: "Something went wrong." });
    } finally {
      setBusyDetails(false);
    }
  };

  const handleUpdatePassword = async () => {
    setBusyPassword(true);
    setMessagePassword(null);
    try {
      const res = await updatePassword({ password, confirm });
      if (res.error) {
        setMessagePassword({ type: "error", text: res.error });
      } else {
        setMessagePassword({ type: "success", text: "Password updated." });
        setPassword("");
        setConfirm("");
      }
    } catch {
      setMessagePassword({ type: "error", text: "Something went wrong." });
    } finally {
      setBusyPassword(false);
    }
  };

  return (
    <>
      {/* Card 1: Your Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Details</h2>

        {messageDetails && (
          <div
            className={
              messageDetails.type === "error"
                ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 mb-4"
                : "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 mb-4"
            }
          >
            {messageDetails.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
            />
            <p className="text-xs text-slate-500 mt-1">
              Changing your email updates your login address immediately — make sure it&apos;s correct.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSaveDetails}
            disabled={busyDetails}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg disabled:opacity-50"
          >
            {busyDetails ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Card 2: Change Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Change Password</h2>

        {messagePassword && (
          <div
            className={
              messagePassword.type === "error"
                ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 mb-4"
                : "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 mb-4"
            }
          >
            {messagePassword.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>

        <ul className="mt-3 space-y-1">
          <li className={`text-sm ${len ? "text-green-600" : "text-slate-500"}`}>
            At least 8 characters
          </li>
          <li className={`text-sm ${upper ? "text-green-600" : "text-slate-500"}`}>
            One uppercase letter
          </li>
          <li className={`text-sm ${lower ? "text-green-600" : "text-slate-500"}`}>
            One lowercase letter
          </li>
          <li className={`text-sm ${match ? "text-green-600" : "text-slate-500"}`}>
            Passwords match
          </li>
        </ul>

        <div className="mt-6">
          <button
            onClick={handleUpdatePassword}
            disabled={!passwordValid || busyPassword}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg disabled:opacity-50"
          >
            {busyPassword ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </>
  );
}
