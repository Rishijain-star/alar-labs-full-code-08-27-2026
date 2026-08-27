import React from "react";

export default function ChangePasswords() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Change Password</h1>

      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <form>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Current Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="Enter current password"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">New Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="Enter new password"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Confirm Password</label>
            <input
              type="password"
              className="w-full border p-2 rounded"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}