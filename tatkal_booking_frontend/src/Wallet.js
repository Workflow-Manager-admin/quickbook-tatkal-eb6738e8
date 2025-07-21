import React from "react";

/**
 * PUBLIC_INTERFACE
 * Wallet panel for showing balance, deposit action, and payment status.
 *
 * Props:
 *   wallet (number): Current wallet balance.
 *   onDeposit (function): (amt: number) => void, triggers deposit of the given amt.
 *   style (object): Optional CSS.
 */
function Wallet({ wallet = 0, onDeposit, style }) {
  return (
    <div
      style={{
        background: "#f3e5f5",
        borderRadius: 10,
        padding: "18px 16px",
        marginBottom: 18,
        boxShadow: "0 2px 8px rgba(100,60,170,0.09)",
        color: "#4e2374",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 17 }}>
        💳 Wallet: <span style={{ color: "#2262c5" }}>₹{wallet.toFixed(2)}</span>
      </div>
      <button
        style={{
          marginLeft: 20,
          background: "#ffab00",
          border: "none",
          borderRadius: 6,
          color: "#212121",
          fontWeight: 700,
          padding: "7px 20px",
          fontSize: 15,
          cursor: "pointer",
          boxShadow: "0 1px 3px #a28b16a1",
        }}
        onClick={() => onDeposit(500)}
        aria-label="Deposit ₹500"
      >
        + ₹500
      </button>
    </div>
  );
}

export default Wallet;
