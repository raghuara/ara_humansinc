import React, { useState } from "react";
import {
  Box, TextField, Button, Typography, Checkbox, FormControlLabel,
  InputAdornment, IconButton, Link, useMediaQuery, Alert, CircularProgress, Collapse, Tooltip,
} from "@mui/material";
import {
  Visibility, VisibilityOff, Info, PersonOutlined, LockOutlined, ArrowForward,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import { loginSuccess } from "../redux/slices/authSlice";
import { PostLogin } from "../Api/Api";
import { apiErrorMessage } from "../Api/http";
import brandLogo from "../images/Logo---Colour.png";
import loginDashboard from "../images/logindashboard.png";

/* ─── BRAND TOKENS ─── */
const B = "#8C72FB";
const BD = "#7B5EF0";
const BL = "#A994FF";
const BDeep = "#6A4EE0";
const F = "'Inter',system-ui,-apple-system,sans-serif";

/* ─── ANIMATION HELPERS ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 + 0.3, ease: "easeOut" } }),
};

/* ═══════════════════════════════════════════════════════════
   RIGHT SIDE — PREMIUM WORKSPACE HERO (v3)
   40% larger laptop, floating analytics cards, dense bg
   ═══════════════════════════════════════════════════════════ */

/* glass analytics card — floats independently */
const FloatCard = ({ children, top, left, right, bottom, w, h, delay = 0, dur = 7, rotate = 0, zIndex = 7 }) => (
  <motion.div
    style={{
      position: "absolute", top, left, right, bottom, width: w, height: h, zIndex,
      borderRadius: 14, background: "rgba(255,255,255,.82)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(140,114,251,.2)", boxShadow: "0 4px 24px rgba(140,114,251,.15), 0 8px 40px rgba(140,114,251,.08)",
      padding: "10px 12px", overflow: "hidden",
    }}
    initial={{ opacity: 0, y: 30, scale: 0.85, rotate: rotate - 3 }}
    animate={{ opacity: 1, y: 0, scale: 1, rotate }}
    transition={{ duration: 0.9, delay: delay + 0.6, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* glass shine */}
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(180deg, rgba(255,255,255,.5) 0%, transparent 100%)", borderRadius: "14px 14px 0 0", pointerEvents: "none" }} />
    <motion.div animate={{ y: [0, -6, 0, 5, 0] }} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.div>
  </motion.div>
);

/* icon bubble */
const Bub = ({ children, size = 50, top, left, right, bottom, delay = 0, dur = 6, sq = false }) => (
  <motion.div
    style={{
      position: "absolute", top, left, right, bottom, width: size, height: size, zIndex: 8,
      borderRadius: sq ? 14 : "50%", background: "rgba(255,255,255,.78)", backdropFilter: "blur(12px)",
      border: "1.5px solid rgba(140,114,251,.22)", display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 20px rgba(140,114,251,.15), 0 8px 32px rgba(140,114,251,.08)",
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1, y: [0, -10, 0, 8, 0] }}
    transition={{
      opacity: { duration: 0.4, delay: delay + 0.8 },
      scale: { duration: 0.5, delay: delay + 0.8, type: "spring", stiffness: 200 },
      y: { duration: dur, repeat: Infinity, ease: "easeInOut", delay: delay + 1 },
    }}
  >{children}</motion.div>
);

/* rotating orbit */
const Ring = ({ size, top, left, delay = 0, dur = 50 }) => (
  <motion.div
    style={{ position: "absolute", top, left, width: size, height: size, borderRadius: "50%", border: "1.5px dashed rgba(140,114,251,.22)", zIndex: 1 }}
    initial={{ opacity: 0, scale: 0.4 }}
    animate={{ opacity: 1, scale: 1, rotate: 360 }}
    transition={{ opacity: { duration: .8, delay: delay + .3 }, scale: { duration: 1, delay: delay + .3 }, rotate: { duration: dur, repeat: Infinity, ease: "linear" } }}
  />
);

/* dot grid */
const DG = ({ top, left, right, bottom, cols = 5, rows = 5, delay = 0 }) => (
  <motion.div
    style={{ position: "absolute", top, left, right, bottom, display: "grid", gridTemplateColumns: `repeat(${cols}, 4px)`, gap: 10, zIndex: 2 }}
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, .55, .3, .55] }}
    transition={{ duration: 4, delay: delay + 1, repeat: Infinity, ease: "easeInOut" }}
  >
    {Array.from({ length: cols * rows }).map((_, i) => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(140,114,251,.3)" }} />)}
  </motion.div>
);

/* glow particle */
const GP = ({ size = 6, top, left, right, bottom, delay = 0, op = .3 }) => (
  <motion.div
    style={{ position: "absolute", top, left, right, bottom, width: size, height: size, borderRadius: "50%", background: `rgba(140,114,251,${op})`, boxShadow: `0 0 ${size * 2}px rgba(140,114,251,${op * .4})`, zIndex: 2 }}
    animate={{ y: [0, -14, 0, 12, 0], opacity: [op, op * 1.6, op * .5, op] }}
    transition={{ duration: 7 + delay * 2, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

const WorkspaceScene = () => {
  const tf = "Inter,sans-serif";
  return (
  <Box sx={{ flex: 1, position: "relative", overflow: "hidden", background: "linear-gradient(155deg, #E8E0FF 0%, #DDD4FF 20%, #CEC2FF 45%, #C0B2FF 70%, #B5A5FF 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>

    {/* ── BACKGROUND LAYERS ── */}
    {/* breathing glow */}
    <motion.div style={{ position: "absolute", width: "150%", height: "150%", top: "-25%", left: "-25%", background: "radial-gradient(ellipse at 40% 45%, rgba(140,114,251,.2) 0%, transparent 50%)", pointerEvents: "none" }}
      animate={{ opacity: [.5, 1, .5], scale: [1, 1.06, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
    {/* moving spotlight */}
    <motion.div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(140,114,251,.14) 0%, transparent 65%)", pointerEvents: "none", zIndex: 1 }}
      animate={{ x: ["-15%", "55%", "-15%"], y: ["-10%", "35%", "-10%"] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
    {/* gradient curved lines */}
    <motion.svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, delay: .5 }}>
      <path d="M 0 70 Q 30 30, 60 50 T 100 20" stroke="rgba(140,114,251,.15)" strokeWidth=".4" fill="none" />
      <path d="M 0 85 Q 40 50, 70 65 T 100 35" stroke="rgba(140,114,251,.12)" strokeWidth=".3" fill="none" />
      <path d="M 10 100 Q 35 60, 55 75 T 90 45" stroke="rgba(140,114,251,.13)" strokeWidth=".25" fill="none" />
    </motion.svg>

    {/* orbit rings */}
    <Ring size={520} top="0%" left="5%" dur={55} />
    <Ring size={340} top="32%" left="52%" delay={.3} dur={42} />
    <Ring size={220} top="10%" left="68%" delay={.5} dur={65} />
    <Ring size={160} top="60%" left="3%" delay={.7} dur={75} />

    {/* dot grids */}
    <DG top="3%" left="2%" cols={5} rows={5} delay={.2} />
    <DG bottom="3%" right="2%" cols={6} rows={4} delay={.5} />
    <DG top="48%" left="1%" cols={3} rows={3} delay={.8} />
    <DG top="8%" right="10%" cols={4} rows={3} delay={1} />
    <DG bottom="20%" left="35%" cols={3} rows={3} delay={1.2} />

    {/* glowing particles — dense coverage */}
    <GP size={10} top="4%" right="25%" delay={0} op={.35} />
    <GP size={6} top="18%" left="5%" delay={.5} op={.2} />
    <GP size={8} bottom="16%" left="10%" delay={1} op={.25} />
    <GP size={5} top="45%" right="3%" delay={.3} op={.22} />
    <GP size={4} top="10%" left="42%" delay={.7} op={.3} />
    <GP size={7} bottom="6%" right="38%" delay={1.2} op={.2} />
    <GP size={9} top="68%" left="28%" delay={.4} op={.15} />
    <GP size={3} top="32%" left="14%" delay={.9} op={.35} />
    <GP size={6} top="75%" right="15%" delay={.6} op={.25} />
    <GP size={8} top="55%" left="48%" delay={1.4} op={.18} />
    <GP size={5} bottom="35%" right="48%" delay={.2} op={.28} />
    <GP size={12} top="12%" left="60%" delay={1.5} op={.12} />

    {/* ── FLOATING ICON BUBBLES ── */}
    <Bub top="16%" left="3%" size={58} delay={.2} dur={7} sq>
      <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill={B}><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
      </motion.div>
    </Bub>
    <Bub top="5%" right="4%" size={54} delay={.4} dur={6}>
      <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        <Typography sx={{ color: B, fontSize: "1.4rem", fontWeight: 800, fontFamily: F }}>$</Typography>
      </motion.div>
    </Bub>
    <Bub top="38%" right="1%" size={50} delay={.6} dur={5.5} sq>
      <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={B}><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
      </motion.div>
    </Bub>
    <Bub bottom="22%" right="5%" size={46} delay={.8} dur={6.5} sq>
      <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={B}><path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2 0v9h9c-.47-4.74-4.24-8.52-8.97-8.99zM13 13v9c4.74-.47 8.5-4.25 8.97-8.99H13z"/></svg>
      </motion.div>
    </Bub>
    <Bub bottom="38%" left="6%" size={42} delay={1.1} dur={8} sq>
      <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill={B}><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      </motion.div>
    </Bub>
    <Bub top="58%" left="1%" size={40} delay={1.3} dur={5}>
      <motion.div animate={{ y: [0, -3, 0], scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={B}><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
      </motion.div>
    </Bub>

    {/* ── FLOATING ANALYTICS CARDS ── */}

    {/* Revenue card — top-left */}
    <FloatCard top="4%" left="14%" w={160} h="auto" delay={.3} rotate={-2} dur={8}>
      <Typography sx={{ fontSize: ".52rem", fontWeight: 700, color: "#9A94A8", fontFamily: tf, textTransform: "uppercase", letterSpacing: ".08em" }}>Monthly Revenue</Typography>
      <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#1A1A2E", fontFamily: tf, mt: .3 }}>$248,500</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: .3, mt: .3 }}>
        <Box sx={{ px: .5, py: .1, borderRadius: "4px", background: "rgba(34,197,94,.2)" }}>
          <Typography sx={{ fontSize: ".48rem", fontWeight: 700, color: "#4ADE80" }}>+18.2%</Typography>
        </Box>
        <Typography sx={{ fontSize: ".45rem", color: "#9A94A8", fontFamily: tf }}>vs last month</Typography>
      </Box>
      {/* mini sparkline */}
      <svg width="130" height="24" style={{ marginTop: 6, display: "block" }}>
        <defs><linearGradient id="skg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={B} stopOpacity=".15"/><stop offset="100%" stopColor={B} stopOpacity="0"/></linearGradient></defs>
        <path d="M0 20 L18 14 L36 17 L54 10 L72 12 L90 6 L108 8 L130 2 L130 24 L0 24Z" fill="url(#skg)" />
        <path d="M0 20 L18 14 L36 17 L54 10 L72 12 L90 6 L108 8 L130 2" fill="none" stroke={B} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </FloatCard>

    {/* Employees card — top-right */}
    <FloatCard top="6%" right="14%" w={130} h="auto" delay={.5} rotate={3} dur={7}>
      <Typography sx={{ fontSize: ".5rem", fontWeight: 700, color: "#9A94A8", fontFamily: tf, textTransform: "uppercase", letterSpacing: ".08em" }}>Active Employees</Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: .4, mt: .3 }}>
        <Typography sx={{ fontSize: "1.2rem", fontWeight: 800, color: "#1A1A2E", fontFamily: tf }}>2,450</Typography>
        <Typography sx={{ fontSize: ".48rem", color: "#4ADE80", fontWeight: 600, fontFamily: tf }}>+12</Typography>
      </Box>
      {/* mini avatars */}
      <Box sx={{ display: "flex", mt: .8 }}>
        {[B, BL, BD, BDeep, "#9B83FC"].map((c, i) => (
          <Box key={i} sx={{ width: 18, height: 18, borderRadius: "50%", background: c, border: "1.5px solid rgba(140,114,251,.2)", ml: i > 0 ? "-.35rem" : 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 - i }}>
            <Typography sx={{ fontSize: ".35rem", fontWeight: 700, color: "white" }}>{["AK","SM","RJ","LP","MK"][i]}</Typography>
          </Box>
        ))}
        <Box sx={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(140,114,251,.06)", border: "1.5px solid rgba(140,114,251,.1)", ml: "-.35rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontSize: ".35rem", fontWeight: 600, color: "#9A94A8" }}>+38</Typography>
        </Box>
      </Box>
    </FloatCard>

    {/* Compliance card — mid-right */}
    <FloatCard top="44%" right="12%" w={140} h="auto" delay={.9} rotate={-1} dur={6.5}>
      <Typography sx={{ fontSize: ".5rem", fontWeight: 700, color: "#9A94A8", fontFamily: tf, textTransform: "uppercase", letterSpacing: ".08em", mb: .4 }}>Compliance</Typography>
      {[{n:"GDPR",s:"Passed",c:"#4ADE80"},{n:"SOX",s:"Passed",c:"#4ADE80"},{n:"PCI",s:"Review",c:"#FBBF24"}].map((c,i) => (
        <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: .3, borderBottom: i < 2 ? "1px solid rgba(0,0,0,.04)" : "none" }}>
          <Typography sx={{ fontSize: ".5rem", fontWeight: 500, color: "#6B6780", fontFamily: tf }}>{c.n}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: .25 }}>
            <Box sx={{ width: 4, height: 4, borderRadius: "50%", background: c.c }} />
            <Typography sx={{ fontSize: ".45rem", fontWeight: 600, color: c.c, fontFamily: tf }}>{c.s}</Typography>
          </Box>
        </Box>
      ))}
    </FloatCard>

    {/* Next Payroll card — bottom-left */}
    <FloatCard bottom="8%" left="4%" w={130} h="auto" delay={1.1} rotate={2} dur={7.5}>
      <Typography sx={{ fontSize: ".5rem", fontWeight: 700, color: "#9A94A8", fontFamily: tf, textTransform: "uppercase", letterSpacing: ".08em" }}>Next Payroll</Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: .3, mt: .3 }}>
        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, color: B, fontFamily: tf, lineHeight: 1 }}>15</Typography>
        <Box>
          <Typography sx={{ fontSize: ".55rem", fontWeight: 600, color: "#6B6780", fontFamily: tf }}>Jul</Typography>
          <Typography sx={{ fontSize: ".42rem", color: "#B8B3C5", fontFamily: tf }}>2026</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: .6, height: 3, borderRadius: 2, background: "rgba(140,114,251,.08)", overflow: "hidden" }}>
        <motion.div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${B}, ${BL})` }}
          initial={{ width: 0 }} animate={{ width: "62%" }} transition={{ delay: 2.5, duration: 1.2 }} />
      </Box>
      <Typography sx={{ fontSize: ".42rem", color: "#B8B3C5", fontFamily: tf, mt: .3 }}>6 days remaining</Typography>
    </FloatCard>

    {/* Pending card — bottom-right */}
    <FloatCard bottom="5%" right="4%" w={135} h="auto" delay={1.3} rotate={-2} dur={6}>
      <Typography sx={{ fontSize: ".5rem", fontWeight: 700, color: "#9A94A8", fontFamily: tf, textTransform: "uppercase", letterSpacing: ".08em" }}>Pending Approvals</Typography>
      <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#1A1A2E", fontFamily: tf, mt: .3 }}>8</Typography>
      <Box sx={{ display: "flex", gap: .4, mt: .6 }}>
        <Box sx={{ flex: 1, py: .35, borderRadius: "6px", background: `rgba(140,114,251,.1)`, textAlign: "center" }}>
          <Typography sx={{ fontSize: ".45rem", fontWeight: 700, color: B }}>Approve</Typography>
        </Box>
        <Box sx={{ flex: 1, py: .35, borderRadius: "6px", background: "rgba(0,0,0,.03)", textAlign: "center" }}>
          <Typography sx={{ fontSize: ".45rem", fontWeight: 500, color: "#9A94A8" }}>Review</Typography>
        </Box>
      </Box>
    </FloatCard>

    {/* ── MAIN SVG — 40% LARGER LAPTOP ── */}
    <motion.div
      style={{ position: "relative", zIndex: 5, width: "95%", maxWidth: 780 }}
      initial={{ opacity: 0, x: 70, scale: .88 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 1.2, delay: .3, ease: [.22, 1, .36, 1] }}
    >
      <motion.div animate={{ y: [0, -8, 0], rotate: [0, .25, 0, -.25, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}>
        <svg viewBox="0 0 900 560" fill="none" style={{ width: "100%", display: "block", filter: "drop-shadow(0 30px 60px rgba(0,0,0,.22))" }}>
          <defs>
            <filter id="cs2" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity=".07"/></filter>
            <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={B}/><stop offset="100%" stopColor={BD}/></linearGradient>
          </defs>

          {/* ── DESK ── */}
          <path d="M 10 410 L 180 340 L 890 340 L 720 410 Z" fill="#CCC0F0" />
          <path d="M 10 410 L 10 428 L 720 428 L 720 410 Z" fill="#BEB2E8" />
          <path d="M 720 410 L 720 428 L 890 358 L 890 340 Z" fill="#B2A6E0" />
          <ellipse cx="450" cy="438" rx="370" ry="14" fill="rgba(0,0,0,.06)" />

          {/* ── NOTEBOOK ── */}
          <g transform="translate(20, 405) rotate(-5)">
            <rect x="3" y="3" width="155" height="115" rx="5" fill="rgba(255,255,255,.8)" />
            <rect width="155" height="115" rx="5" fill="white" />
            {Array.from({length:8}).map((_,i) => <circle key={`sp${i}`} cx="-2" cy={14+i*13} r="3.5" fill="none" stroke="#C8C0D8" strokeWidth="1.2" />)}
            {Array.from({length:7}).map((_,i) => <line key={`rl${i}`} x1="16" y1={18+i*14} x2="142" y2={18+i*14} stroke="#ECEAF3" strokeWidth=".5" />)}
            <g transform="translate(35, 75) rotate(-25)">
              <rect width="90" height="5" rx="2.5" fill="#2A2040" />
              <rect x="-2" y="0" width="10" height="5" rx="2" fill="#4A3A80" />
              <polygon points="90,0 96,2.5 90,5" fill="#999" />
            </g>
          </g>

          {/* ── LAPTOP BASE ── */}
          <path d="M 195 340 L 300 280 L 750 280 L 650 340 Z" fill="#C8BEE4" />
          <path d="M 195 340 L 195 347 L 650 347 L 650 340 Z" fill="#B8AED4" />
          <path d="M 650 340 L 650 347 L 750 287 L 750 280 Z" fill="#ACA2C8" />

          {/* keyboard */}
          <rect x="315" y="286" width="415" height="48" rx="4" fill="#BEB4D0" opacity=".4" transform="skewX(-5)" />
          {Array.from({length:4}).map((_,r) => Array.from({length:15}).map((_,c) =>
            <rect key={`k${r}${c}`} x={305+c*25+(r===1?6:r===2?14:r===3?20:0)} y={290+r*10} width={r===3&&c===0?30:18} height={6.5} rx={1.5} fill={`rgba(40,25,100,${r===0?'.06':'.08'})`} transform="skewX(-5)" />
          ))}
          <rect x="395" y="332" width="130" height="6" rx={3} fill="rgba(40,25,100,.06)" transform="skewX(-5)" />

          {/* ── LAPTOP SCREEN — 40% LARGER ── */}
          <rect x="255" y="16" width="460" height="266" rx="12" fill="#1A1230" />
          <rect x="264" y="25" width="442" height="250" rx="7" fill="white" />
          <circle cx="485" cy="20" r="2.5" fill="#4A4A55" />

          {/* ── DASHBOARD SCREENSHOT ──
              A saved capture of the real app, clipped to the screen's rounded
              corners. `slice` fills the screen edge-to-edge (no letterbox); the
              image is wider than the 442×250 slot (2.11 vs 1.77), so it's pinned
              left (xMin) — that crops only the far-right edge and never the
              sidebar, which is the most recognisable part. */}
          <clipPath id="laptopScreenClip">
            <rect x="264" y="25" width="442" height="250" rx="7" />
          </clipPath>
          <image
            href={loginDashboard}
            x="264" y="25" width="442" height="250"
            preserveAspectRatio="xMinYMid slice"
            clipPath="url(#laptopScreenClip)"
          />

          {/* ── PLANT ── */}
          <g transform="translate(762, 248)">
            <rect x="5" y="40" width="32" height="40" rx="5" fill="#E2DAF2" />
            <rect x="2" y="36" width="38" height="8" rx="4" fill="#D2CAE2" />
            <path d="M 21 36 Q 6 12, 15 2 Q 24 -8, 27 14 Q 29 28, 21 36Z" fill="#4A3A8E" />
            <path d="M 21 36 Q 36 8, 42 2 Q 48 -4, 37 20 Q 29 32, 21 36Z" fill="#3A2A7E" />
            <path d="M 21 36 Q 0 20, 3 8 Q 6 1, 16 22Z" fill="#5A4A9E" />
          </g>

          {/* ── COFFEE MUG ── */}
          <g transform="translate(790, 330)">
            <rect x="0" y="10" width="46" height="54" rx="7" fill="#3A2A6E" />
            <rect x="3" y="5" width="40" height="11" rx="6" fill="#4A3A80" />
            <ellipse cx="23" cy="16" rx="17" ry="3" fill="#2A1A50" />
            <path d="M 46 22 Q 62 24, 60 40 Q 58 54, 46 52" stroke="#3A2A6E" strokeWidth="5.5" fill="none" />
            <text x="14" y="46" fill="rgba(255,255,255,.2)" fontSize="16" fontWeight="800" fontFamily={tf}>A</text>
          </g>

          {/* ── CALCULATOR ── */}
          <g transform="translate(775, 328) rotate(-6)">
            <rect width="85" height="112" rx="8" fill="#2A2042" />
            <rect x="7" y="7" width="71" height="28" rx="4" fill="#3A3062" />
            <text x="65" y="28" fill="#7CF8B8" fontSize="15" fontWeight="600" textAnchor="end" fontFamily="'Courier New',monospace">48750</text>
            {["MC","M+","MR","M-"].map((l,i) => (
              <g key={`ml${i}`}>
                <rect x={8+i*18} y="40" width={15} height={11} rx={2.5} fill="rgba(140,114,251,.35)" />
                <text x={13+i*18} y="48" fill="rgba(255,255,255,.7)" fontSize="4.5" fontWeight="600" textAnchor="middle" fontFamily={tf}>{l}</text>
              </g>
            ))}
            {[["7","8","9","÷"],["4","5","6","×"],["1","2","3","-"],["0",".","=","+"]].map((row,r) =>
              row.map((k,c) => (
                <g key={`ck${r}${c}`}>
                  <rect x={8+c*18} y={55+r*14} width={15} height={11} rx={2.5} fill={c===3?"rgba(140,114,251,.4)":"rgba(255,255,255,.06)"} />
                  <text x={15.5+c*18} y={63+r*14} fill={c===3?"rgba(255,255,255,.8)":"rgba(255,255,255,.35)"} fontSize="5.5" textAnchor="middle" fontFamily={tf}>{k}</text>
                </g>
              ))
            )}
          </g>

          {/* ── PHONE ── */}
          <g transform="translate(265, 418) rotate(-8)">
            <rect width="80" height="142" rx="11" fill="#121028" />
            <rect x="3.5" y="10" width="73" height="122" rx="6" fill="white" />
            <rect x="25" y="3.5" width="30" height="5" rx="2.5" fill="#252040" />
            <rect x="7" y="15" width="66" height="18" rx="4" fill="#FAFAFF" />
            <text x="12" y="24" fill="#9A94A8" fontSize="3.5" fontFamily={tf}>Payroll Summary</text>
            <text x="12" y="30" fill="#1A1A2E" fontSize="4.5" fontWeight="800" fontFamily={tf}>$48,750</text>
            {[{l:"Employees",v:"120",y:38},{l:"Paid",v:"98%",y:58},{l:"Pending",v:"2",y:78}].map((s,i) => (
              <g key={`ph${i}`}>
                <rect x="8" y={s.y} width="64" height="17" rx="3.5" fill="#FAFAFF" stroke="#F0EEF8" strokeWidth=".3" />
                <text x="13" y={s.y+8} fill="#9A94A8" fontSize="3.5" fontFamily={tf}>{s.l}</text>
                <text x="13" y={s.y+14} fill="#1A1A2E" fontSize="4.5" fontWeight="700" fontFamily={tf}>{s.v}</text>
              </g>
            ))}
            <rect x="8" y="100" width="64" height="24" rx="3.5" fill="#FAFAFF" />
            {[16,22,12,25,18,28,20].map((h,i) => <rect key={`pbb${i}`} x={14+i*8} y={120-h} width={4.5} height={h} rx={1.2} fill={i===5?B:"#D8D2F0"} />)}
          </g>

          {/* ── PAYROLL REPORT ── */}
          <g transform="translate(400, 440) rotate(3)">
            <rect x="4" y="4" width="150" height="108" rx="5" fill="rgba(255,255,255,.7)" />
            <rect x="2" y="2" width="150" height="108" rx="5" fill="rgba(255,255,255,.85)" />
            <rect width="150" height="108" rx="5" fill="white" />
            <rect x="64" y="-7" width="22" height="13" rx="2.5" fill="#2A2042" />
            <rect x="67" y="-9" width="16" height="4.5" rx="2" fill="#4A3A80" />
            <text x="16" y="22" fill="#1A1A2E" fontSize="11" fontWeight="800" fontFamily={tf} fontStyle="italic">Payroll Report</text>
            {["Employee","Basic Pay","Deductions","Net Pay"].map((h,i) => <text key={`hd${i}`} x={[16,60,92,125][i]} y="38" fill="#9A94A8" fontSize="4" fontFamily={tf}>{h}</text>)}
            {[44,52,60,68,76,84].map((y,i) => (
              <g key={`rw${i}`}>
                <rect x="16" y={y} width={34-i*2} height="2.5" rx="1" fill="#ECEAF3" />
                <rect x="60" y={y} width="24" height="2.5" rx="1" fill="#ECEAF3" />
                <rect x="92" y={y} width="22" height="2.5" rx="1" fill="#ECEAF3" />
                <rect x="125" y={y} width="18" height="2.5" rx="1" fill="#ECEAF3" />
              </g>
            ))}
            <circle cx="122" cy="20" r="14" fill="#F0EEF8" />
            <path d="M 122 20 L 122 6 A 14 14 0 0 1 134 26 Z" fill={B} />
            <circle cx="122" cy="20" r="6" fill="white" />
            <g transform="translate(100, 76) rotate(-35)">
              <rect width="62" height="4" rx="2" fill="#2A2042" />
              <polygon points="62,0 67,2 62,4" fill="#999" />
              <rect x="-1" y="0" width="9" height="4" rx="1.5" fill="#4A3A80" />
            </g>
          </g>
        </svg>
      </motion.div>
    </motion.div>
  </Box>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN LOGIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isMobile = useMediaQuery("(max-width:900px)");

  // Login is the one call that must NOT go through the authed client — there is
  // no token yet, and a stale one would only get in the way.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const id = userName.trim();
    if (!id || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(
        PostLogin,
        { userName: id, password },
        { headers: { "Content-Type": "application/json" }, timeout: 20000 },
      );

      // The API answers 200 with `{ error: true, message }` on a bad login, so
      // a successful HTTP status is not on its own a successful login.
      const body = res.data;
      if (!body || body.error || !body.data?.token) {
        setError(body?.message || "Invalid email or password.");
        return;
      }

      // Store the token, both expiry stamps, the user record and the module
      // list exactly as the server sent them.
      dispatch(loginSuccess({ ...body.data, remember }));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not sign you in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const stagger = { visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } };
  const cardAnim = {
    hidden: { opacity: 0, x: -50, scale: 0.96 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
  };

  const inputSx = {
    mb: 2.5,
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px", fontFamily: F, fontSize: ".92rem", backgroundColor: "#F6F5FA",
      "& fieldset": { borderColor: "#E8E6F0", borderWidth: "1.5px" },
      "&:hover fieldset": { borderColor: B },
      "&.Mui-focused fieldset": { borderColor: B, borderWidth: "2px", boxShadow: `0 0 0 3px rgba(140,114,251,.08)` },
      "&.Mui-focused": { backgroundColor: "white" },
    },
    "& .MuiInputLabel-root": { fontFamily: F, color: "#9A94A8", fontSize: ".86rem", "&.Mui-focused": { color: B } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: "100vh", background: "#E8E0FF" }}>

        {/* ═══════ LEFT — LOGIN CARD ═══════ */}
        <Box sx={{
          flex: isMobile ? "none" : "0 0 40%", display: "flex", alignItems: "center", justifyContent: "center",
          p: isMobile ? 3 : 4, position: "relative", zIndex: 5,
          background: isMobile ? "white" : "transparent",
        }}>
          <motion.div
            variants={cardAnim} initial="hidden" animate="visible"
            style={{
              width: "100%", maxWidth: 440, background: "white", borderRadius: "24px",
              padding: isMobile ? "32px 24px 24px" : "40px 38px 30px",
              boxShadow: isMobile ? "none" : "0 24px 80px rgba(0,0,0,.1), 0 4px 20px rgba(0,0,0,.04)",
              position: "relative", overflow: "hidden",
            }}
          >
            <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${B}, ${BL})`, borderRadius: "24px 24px 0 0" }} />

            <motion.div variants={stagger} initial="hidden" animate="visible">
              {/* Logo */}
              <motion.div variants={fadeUp} custom={0}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2.5 }}>
                  <Box component="img" src={brandLogo} alt="ARA HumanSync" sx={{ height: 44, width: "auto", objectFit: "contain" }} />
                </Box>
              </motion.div>

              {/* Welcome */}
              <motion.div variants={fadeUp} custom={1}>
                <Typography sx={{ textAlign: "center", fontWeight: 800, fontSize: "1.6rem", fontFamily: F, color: "#1A1A2E", mb: 0.4, letterSpacing: "-.02em" }}>
                  Welcome Back!
                </Typography>
              </motion.div>
              
              <motion.div variants={fadeUp} custom={2}>
                <Typography sx={{ textAlign: "center", fontSize: ".86rem", fontFamily: F, color: "#8E8E9A", mb: 3 }}>
                  Sign in by entering the information below
                </Typography>
              </motion.div>

              <Box component="form" onSubmit={handleSubmit}>
                {/* Server-side failures land here — wrong password, server down,
                    no network. Collapse keeps the card from jumping. */}
                <Collapse in={Boolean(error)}>
                  <Alert
                    severity="error"
                    onClose={() => setError("")}
                    sx={{ mb: 2, borderRadius: "12px", fontFamily: F, fontSize: ".82rem", alignItems: "center", "& .MuiAlert-message": { py: 0.3 } }}
                  >
                    {error}
                  </Alert>
                </Collapse>

                {/* Email — the API authenticates on `userName` (the sign-in email) */}
                <motion.div variants={fadeUp} custom={3}>
                  <TextField fullWidth label="Email" placeholder="you@company.com"
                    value={userName} onChange={(e) => setUserName(e.target.value)}
                    autoComplete="username" autoFocus disabled={loading}
                    error={Boolean(error) && !userName.trim()} sx={inputSx}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlined sx={{ fontSize: 20, color: "#B8B3C5" }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </motion.div>

                {/* Password */}
                <motion.div variants={fadeUp} custom={4}>
                  <TextField fullWidth label="Password" placeholder="••••••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} type={showPw ? "text" : "password"}
                    autoComplete="current-password" disabled={loading}
                    error={Boolean(error) && !password}
                    sx={{ ...inputSx, mb: 1.5 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlined sx={{ fontSize: 20, color: "#B8B3C5" }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            {/* The icon shows the CURRENT state, not the action:
                                open eye  → password is visible (type="text")
                                shut eye  → password is masked  (type="password")
                                It also goes violet while revealed, so it's obvious
                                at a glance that the password is on screen. */}
                            <Tooltip arrow title={showPw ? "Hide password" : "Show password"}>
                              <IconButton
                                onClick={() => setShowPw((v) => !v)}
                                onMouseDown={(e) => e.preventDefault()}  // don't steal focus from the field
                                edge="end"
                                disabled={loading}
                                aria-label={showPw ? "Hide password" : "Show password"}
                                aria-pressed={showPw}
                                sx={{
                                  color: showPw ? B : "#B8B3C5",
                                  transition: "color .18s",
                                  "&:hover": { color: B, bgcolor: "rgba(140,114,251,.08)" },
                                }}
                              >
                                {showPw
                                  ? <Visibility sx={{ fontSize: 20 }} />
                                  : <VisibilityOff sx={{ fontSize: 20 }} />}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </motion.div>

                {/* Remember + Forgot */}
                <motion.div variants={fadeUp} custom={5}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                    <FormControlLabel
                      control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={loading}
                        sx={{ color: "#D0CCE0", "&.Mui-checked": { color: B }, "& .MuiSvgIcon-root": { fontSize: 20 } }} />}
                      label={<Typography sx={{ fontSize: ".82rem", fontFamily: F, color: "#6B6780", fontWeight: 500 }}>Remember Me</Typography>}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                      <Info sx={{ fontSize: 14, color: B, opacity: 0.7 }} />
                      <Link href="#" underline="none" sx={{ fontSize: ".82rem", fontFamily: F, fontWeight: 600, color: B, "&:hover": { opacity: 0.8 } }}>
                        Forgotten Password?
                      </Link>
                    </Box>
                  </Box>
                </motion.div>

                {/* Continue Button */}
                <motion.div variants={fadeUp} custom={6}>
                  <motion.div whileHover={loading ? undefined : { scale: 1.015, y: -1 }} whileTap={loading ? undefined : { scale: 0.985 }}>
                    <Button fullWidth type="submit" variant="contained" disabled={loading}
                      endIcon={loading
                        ? <CircularProgress size={18} thickness={5} sx={{ color: "#fff" }} />
                        : <ArrowForward sx={{ fontSize: 20 }} />}
                      sx={{
                        py: 1.5, borderRadius: "12px", fontSize: ".95rem", fontWeight: 700, fontFamily: F, textTransform: "none",
                        background: `linear-gradient(135deg, ${B}, ${BD})`, letterSpacing: ".01em", color:"#fff",
                        boxShadow: `0 6px 24px rgba(140,114,251,.35)`,
                        "&:hover": { background: `linear-gradient(135deg, ${BD}, ${BDeep})`, boxShadow: `0 10px 32px rgba(140,114,251,.45)` },
                        "&.Mui-disabled": { background: `linear-gradient(135deg, ${B}, ${BD})`, color: "#fff", opacity: .7 },
                      }}
                    >
                      {loading ? "Signing in…" : "Continue"}
                    </Button>
                  </motion.div>
                </motion.div>

              </Box>

              <motion.div variants={fadeUp} custom={10}>
                <Typography sx={{ textAlign: "center", fontSize: ".72rem", fontFamily: F, color: "#C5C1D0", mt: 2.5 }}>
                  &copy; 2025 ARA HumanSync. All rights reserved.
                </Typography>
              </motion.div>
            </motion.div>
          </motion.div>
        </Box>

        {/* ═══════ RIGHT — WORKSPACE SCENE ═══════ */}
        {!isMobile && <WorkspaceScene />}
      </Box>
    </motion.div>
  );
}
