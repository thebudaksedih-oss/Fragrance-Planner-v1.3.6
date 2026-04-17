import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Search, X, ChevronLeft, MoreVertical, Copy, CheckSquare, Palette, ArrowUp, ArrowDown, Sparkles, ArrowRight, ArrowDownRight, ArrowUpRight, HelpCircle, Database, Layout, Eye, Pencil } from 'lucide-react';
import { Fragrance, UserTheme } from '../types';

import { useConfirm } from '../hooks/useConfirm';
import TutorialModal from './TutorialModal';

interface Props {
  fragrances: Fragrance[];
  setFragrances: React.Dispatch<React.SetStateAction<Fragrance[]>>;
  userThemes: UserTheme[];
  setUserThemes: React.Dispatch<React.SetStateAction<UserTheme[]>>;
}

interface ColorTheme {
  id: string;
  name: string;
  top: string;
  bottom: string;
  text: string;
  subText: string;
  accent: string;
  border: string;
  tagBg: string;
  tagText: string;
}

export const colorThemes: ColorTheme[] = [
  {id:"default",name:"Default",top:"bg-app-card",bottom:"bg-app-card",text:"text-app-text",subText:"text-app-muted",accent:"bg-app-accent",border:"border-app-border",tagBg:"bg-app-bg",tagText:"text-app-text"},
  {id:"black-gold",name:"Black Gold",top:"bg-gray-900",bottom:"bg-gray-800",text:"text-yellow-500",subText:"text-gray-400",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-gray-700",tagBg:"bg-gray-700",tagText:"text-yellow-400"},
  {id:"silver-gold",name:"Silver Gold",top:"bg-gray-200",bottom:"bg-gray-100",text:"text-yellow-700",subText:"text-gray-500",accent:"bg-gradient-to-r from-gray-400 to-yellow-500",border:"border-gray-300",tagBg:"bg-gray-300",tagText:"text-gray-700"},
  {id:"white-gold",name:"White Gold",top:"bg-white",bottom:"bg-yellow-50",text:"text-yellow-600",subText:"text-gray-400",accent:"bg-gradient-to-r from-yellow-200 to-yellow-500",border:"border-yellow-100",tagBg:"bg-yellow-100",tagText:"text-yellow-700"},
  {id:"black-rose-gold",name:"Black Rose Gold",top:"bg-gray-900",bottom:"bg-gray-800",text:"text-rose-400",subText:"text-gray-400",accent:"bg-gradient-to-r from-rose-300 to-rose-500",border:"border-gray-700",tagBg:"bg-gray-700",tagText:"text-rose-300"},
  {id:"white-rose-gold",name:"White Rose Gold",top:"bg-white",bottom:"bg-rose-50",text:"text-rose-500",subText:"text-gray-400",accent:"bg-gradient-to-r from-rose-200 to-rose-400",border:"border-rose-100",tagBg:"bg-rose-100",tagText:"text-rose-600"},
  {id:"obsidian",name:"Obsidian",top:"bg-black",bottom:"bg-zinc-900",text:"text-zinc-300",subText:"text-zinc-500",accent:"bg-gradient-to-r from-zinc-500 to-zinc-700",border:"border-zinc-800",tagBg:"bg-zinc-800",tagText:"text-zinc-400"},
  {id:"pearl",name:"Pearl",top:"bg-slate-50",bottom:"bg-white",text:"text-slate-800",subText:"text-slate-500",accent:"bg-gradient-to-r from-slate-200 to-slate-400",border:"border-slate-200",tagBg:"bg-slate-100",tagText:"text-slate-600"},
  {id:"neon-nights",name:"Neon Nights",top:"bg-indigo-950",bottom:"bg-indigo-900",text:"text-fuchsia-400",subText:"text-cyan-400",accent:"bg-gradient-to-r from-fuchsia-500 to-cyan-500",border:"border-indigo-800",tagBg:"bg-indigo-800",tagText:"text-fuchsia-300"},
  {id:"red-light",name:"Red Light",top:"bg-red-50",bottom:"bg-red-100",text:"text-red-900",subText:"text-red-600",accent:"bg-gradient-to-r from-red-300 to-red-500",border:"border-red-200",tagBg:"bg-red-200",tagText:"text-red-800"},
  {id:"red-soft",name:"Red Soft",top:"bg-red-100",bottom:"bg-red-200",text:"text-red-900",subText:"text-red-700",accent:"bg-gradient-to-r from-red-400 to-red-600",border:"border-red-300",tagBg:"bg-red-300",tagText:"text-red-900"},
  {id:"red-medium",name:"Red Medium",top:"bg-red-500",bottom:"bg-red-600",text:"text-white",subText:"text-red-100",accent:"bg-gradient-to-r from-red-300 to-red-400",border:"border-red-700",tagBg:"bg-red-700",tagText:"text-red-100"},
  {id:"red-dark",name:"Red Dark",top:"bg-red-800",bottom:"bg-red-900",text:"text-red-50",subText:"text-red-300",accent:"bg-gradient-to-r from-red-400 to-red-600",border:"border-red-700",tagBg:"bg-red-700",tagText:"text-red-200"},
  {id:"red-deep",name:"Red Deep",top:"bg-red-900",bottom:"bg-red-950",text:"text-red-100",subText:"text-red-400",accent:"bg-gradient-to-r from-red-500 to-red-700",border:"border-red-800",tagBg:"bg-red-800",tagText:"text-red-300"},
  {id:"black-red",name:"Black & Red",top:"bg-black",bottom:"bg-red-950",text:"text-red-400",subText:"text-red-600",accent:"bg-gradient-to-r from-red-600 to-red-800",border:"border-red-900",tagBg:"bg-red-900",tagText:"text-red-500"},
  {id:"white-red",name:"White & Red",top:"bg-white",bottom:"bg-red-50",text:"text-red-600",subText:"text-red-400",accent:"bg-gradient-to-r from-red-200 to-red-400",border:"border-red-100",tagBg:"bg-red-100",tagText:"text-red-700"},
  {id:"red-gold",name:"Red & Gold",top:"bg-red-900",bottom:"bg-red-800",text:"text-yellow-500",subText:"text-red-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-red-700",tagBg:"bg-red-700",tagText:"text-yellow-400"},
  {id:"orange-light",name:"Orange Light",top:"bg-orange-50",bottom:"bg-orange-100",text:"text-orange-900",subText:"text-orange-600",accent:"bg-gradient-to-r from-orange-300 to-orange-500",border:"border-orange-200",tagBg:"bg-orange-200",tagText:"text-orange-800"},
  {id:"orange-soft",name:"Orange Soft",top:"bg-orange-100",bottom:"bg-orange-200",text:"text-orange-900",subText:"text-orange-700",accent:"bg-gradient-to-r from-orange-400 to-orange-600",border:"border-orange-300",tagBg:"bg-orange-300",tagText:"text-orange-900"},
  {id:"orange-medium",name:"Orange Medium",top:"bg-orange-500",bottom:"bg-orange-600",text:"text-white",subText:"text-orange-100",accent:"bg-gradient-to-r from-orange-300 to-orange-400",border:"border-orange-700",tagBg:"bg-orange-700",tagText:"text-orange-100"},
  {id:"orange-dark",name:"Orange Dark",top:"bg-orange-800",bottom:"bg-orange-900",text:"text-orange-50",subText:"text-orange-300",accent:"bg-gradient-to-r from-orange-400 to-orange-600",border:"border-orange-700",tagBg:"bg-orange-700",tagText:"text-orange-200"},
  {id:"orange-deep",name:"Orange Deep",top:"bg-orange-900",bottom:"bg-orange-950",text:"text-orange-100",subText:"text-orange-400",accent:"bg-gradient-to-r from-orange-500 to-orange-700",border:"border-orange-800",tagBg:"bg-orange-800",tagText:"text-orange-300"},
  {id:"black-orange",name:"Black & Orange",top:"bg-black",bottom:"bg-orange-950",text:"text-orange-400",subText:"text-orange-600",accent:"bg-gradient-to-r from-orange-600 to-orange-800",border:"border-orange-900",tagBg:"bg-orange-900",tagText:"text-orange-500"},
  {id:"white-orange",name:"White & Orange",top:"bg-white",bottom:"bg-orange-50",text:"text-orange-600",subText:"text-orange-400",accent:"bg-gradient-to-r from-orange-200 to-orange-400",border:"border-orange-100",tagBg:"bg-orange-100",tagText:"text-orange-700"},
  {id:"orange-gold",name:"Orange & Gold",top:"bg-orange-900",bottom:"bg-orange-800",text:"text-yellow-500",subText:"text-orange-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-orange-700",tagBg:"bg-orange-700",tagText:"text-yellow-400"},
  {id:"amber-light",name:"Amber Light",top:"bg-amber-50",bottom:"bg-amber-100",text:"text-amber-900",subText:"text-amber-600",accent:"bg-gradient-to-r from-amber-300 to-amber-500",border:"border-amber-200",tagBg:"bg-amber-200",tagText:"text-amber-800"},
  {id:"amber-soft",name:"Amber Soft",top:"bg-amber-100",bottom:"bg-amber-200",text:"text-amber-900",subText:"text-amber-700",accent:"bg-gradient-to-r from-amber-400 to-amber-600",border:"border-amber-300",tagBg:"bg-amber-300",tagText:"text-amber-900"},
  {id:"amber-medium",name:"Amber Medium",top:"bg-amber-500",bottom:"bg-amber-600",text:"text-white",subText:"text-amber-100",accent:"bg-gradient-to-r from-amber-300 to-amber-400",border:"border-amber-700",tagBg:"bg-amber-700",tagText:"text-amber-100"},
  {id:"amber-dark",name:"Amber Dark",top:"bg-amber-800",bottom:"bg-amber-900",text:"text-amber-50",subText:"text-amber-300",accent:"bg-gradient-to-r from-amber-400 to-amber-600",border:"border-amber-700",tagBg:"bg-amber-700",tagText:"text-amber-200"},
  {id:"amber-deep",name:"Amber Deep",top:"bg-amber-900",bottom:"bg-amber-950",text:"text-amber-100",subText:"text-amber-400",accent:"bg-gradient-to-r from-amber-500 to-amber-700",border:"border-amber-800",tagBg:"bg-amber-800",tagText:"text-amber-300"},
  {id:"black-amber",name:"Black & Amber",top:"bg-black",bottom:"bg-amber-950",text:"text-amber-400",subText:"text-amber-600",accent:"bg-gradient-to-r from-amber-600 to-amber-800",border:"border-amber-900",tagBg:"bg-amber-900",tagText:"text-amber-500"},
  {id:"white-amber",name:"White & Amber",top:"bg-white",bottom:"bg-amber-50",text:"text-amber-600",subText:"text-amber-400",accent:"bg-gradient-to-r from-amber-200 to-amber-400",border:"border-amber-100",tagBg:"bg-amber-100",tagText:"text-amber-700"},
  {id:"amber-gold",name:"Amber & Gold",top:"bg-amber-900",bottom:"bg-amber-800",text:"text-yellow-500",subText:"text-amber-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-amber-700",tagBg:"bg-amber-700",tagText:"text-yellow-400"},
  {id:"yellow-light",name:"Yellow Light",top:"bg-yellow-50",bottom:"bg-yellow-100",text:"text-yellow-900",subText:"text-yellow-600",accent:"bg-gradient-to-r from-yellow-300 to-yellow-500",border:"border-yellow-200",tagBg:"bg-yellow-200",tagText:"text-yellow-800"},
  {id:"yellow-soft",name:"Yellow Soft",top:"bg-yellow-100",bottom:"bg-yellow-200",text:"text-yellow-900",subText:"text-yellow-700",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-yellow-300",tagBg:"bg-yellow-300",tagText:"text-yellow-900"},
  {id:"yellow-medium",name:"Yellow Medium",top:"bg-yellow-500",bottom:"bg-yellow-600",text:"text-white",subText:"text-yellow-100",accent:"bg-gradient-to-r from-yellow-300 to-yellow-400",border:"border-yellow-700",tagBg:"bg-yellow-700",tagText:"text-yellow-100"},
  {id:"yellow-dark",name:"Yellow Dark",top:"bg-yellow-800",bottom:"bg-yellow-900",text:"text-yellow-50",subText:"text-yellow-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-yellow-700",tagBg:"bg-yellow-700",tagText:"text-yellow-200"},
  {id:"yellow-deep",name:"Yellow Deep",top:"bg-yellow-900",bottom:"bg-yellow-950",text:"text-yellow-100",subText:"text-yellow-400",accent:"bg-gradient-to-r from-yellow-500 to-yellow-700",border:"border-yellow-800",tagBg:"bg-yellow-800",tagText:"text-yellow-300"},
  {id:"black-yellow",name:"Black & Yellow",top:"bg-black",bottom:"bg-yellow-950",text:"text-yellow-400",subText:"text-yellow-600",accent:"bg-gradient-to-r from-yellow-600 to-yellow-800",border:"border-yellow-900",tagBg:"bg-yellow-900",tagText:"text-yellow-500"},
  {id:"white-yellow",name:"White & Yellow",top:"bg-white",bottom:"bg-yellow-50",text:"text-yellow-600",subText:"text-yellow-400",accent:"bg-gradient-to-r from-yellow-200 to-yellow-400",border:"border-yellow-100",tagBg:"bg-yellow-100",tagText:"text-yellow-700"},
  {id:"yellow-gold",name:"Yellow & Gold",top:"bg-yellow-900",bottom:"bg-yellow-800",text:"text-yellow-500",subText:"text-yellow-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-yellow-700",tagBg:"bg-yellow-700",tagText:"text-yellow-400"},
  {id:"lime-light",name:"Lime Light",top:"bg-lime-50",bottom:"bg-lime-100",text:"text-lime-900",subText:"text-lime-600",accent:"bg-gradient-to-r from-lime-300 to-lime-500",border:"border-lime-200",tagBg:"bg-lime-200",tagText:"text-lime-800"},
  {id:"lime-soft",name:"Lime Soft",top:"bg-lime-100",bottom:"bg-lime-200",text:"text-lime-900",subText:"text-lime-700",accent:"bg-gradient-to-r from-lime-400 to-lime-600",border:"border-lime-300",tagBg:"bg-lime-300",tagText:"text-lime-900"},
  {id:"lime-medium",name:"Lime Medium",top:"bg-lime-500",bottom:"bg-lime-600",text:"text-white",subText:"text-lime-100",accent:"bg-gradient-to-r from-lime-300 to-lime-400",border:"border-lime-700",tagBg:"bg-lime-700",tagText:"text-lime-100"},
  {id:"lime-dark",name:"Lime Dark",top:"bg-lime-800",bottom:"bg-lime-900",text:"text-lime-50",subText:"text-lime-300",accent:"bg-gradient-to-r from-lime-400 to-lime-600",border:"border-lime-700",tagBg:"bg-lime-700",tagText:"text-lime-200"},
  {id:"lime-deep",name:"Lime Deep",top:"bg-lime-900",bottom:"bg-lime-950",text:"text-lime-100",subText:"text-lime-400",accent:"bg-gradient-to-r from-lime-500 to-lime-700",border:"border-lime-800",tagBg:"bg-lime-800",tagText:"text-lime-300"},
  {id:"black-lime",name:"Black & Lime",top:"bg-black",bottom:"bg-lime-950",text:"text-lime-400",subText:"text-lime-600",accent:"bg-gradient-to-r from-lime-600 to-lime-800",border:"border-lime-900",tagBg:"bg-lime-900",tagText:"text-lime-500"},
  {id:"white-lime",name:"White & Lime",top:"bg-white",bottom:"bg-lime-50",text:"text-lime-600",subText:"text-lime-400",accent:"bg-gradient-to-r from-lime-200 to-lime-400",border:"border-lime-100",tagBg:"bg-lime-100",tagText:"text-lime-700"},
  {id:"lime-gold",name:"Lime & Gold",top:"bg-lime-900",bottom:"bg-lime-800",text:"text-yellow-500",subText:"text-lime-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-lime-700",tagBg:"bg-lime-700",tagText:"text-yellow-400"},
  {id:"green-light",name:"Green Light",top:"bg-green-50",bottom:"bg-green-100",text:"text-green-900",subText:"text-green-600",accent:"bg-gradient-to-r from-green-300 to-green-500",border:"border-green-200",tagBg:"bg-green-200",tagText:"text-green-800"},
  {id:"green-soft",name:"Green Soft",top:"bg-green-100",bottom:"bg-green-200",text:"text-green-900",subText:"text-green-700",accent:"bg-gradient-to-r from-green-400 to-green-600",border:"border-green-300",tagBg:"bg-green-300",tagText:"text-green-900"},
  {id:"green-medium",name:"Green Medium",top:"bg-green-500",bottom:"bg-green-600",text:"text-white",subText:"text-green-100",accent:"bg-gradient-to-r from-green-300 to-green-400",border:"border-green-700",tagBg:"bg-green-700",tagText:"text-green-100"},
  {id:"green-dark",name:"Green Dark",top:"bg-green-800",bottom:"bg-green-900",text:"text-green-50",subText:"text-green-300",accent:"bg-gradient-to-r from-green-400 to-green-600",border:"border-green-700",tagBg:"bg-green-700",tagText:"text-green-200"},
  {id:"green-deep",name:"Green Deep",top:"bg-green-900",bottom:"bg-green-950",text:"text-green-100",subText:"text-green-400",accent:"bg-gradient-to-r from-green-500 to-green-700",border:"border-green-800",tagBg:"bg-green-800",tagText:"text-green-300"},
  {id:"black-green",name:"Black & Green",top:"bg-black",bottom:"bg-green-950",text:"text-green-400",subText:"text-green-600",accent:"bg-gradient-to-r from-green-600 to-green-800",border:"border-green-900",tagBg:"bg-green-900",tagText:"text-green-500"},
  {id:"white-green",name:"White & Green",top:"bg-white",bottom:"bg-green-50",text:"text-green-600",subText:"text-green-400",accent:"bg-gradient-to-r from-green-200 to-green-400",border:"border-green-100",tagBg:"bg-green-100",tagText:"text-green-700"},
  {id:"green-gold",name:"Green & Gold",top:"bg-green-900",bottom:"bg-green-800",text:"text-yellow-500",subText:"text-green-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-green-700",tagBg:"bg-green-700",tagText:"text-yellow-400"},
  {id:"emerald-light",name:"Emerald Light",top:"bg-emerald-50",bottom:"bg-emerald-100",text:"text-emerald-900",subText:"text-emerald-600",accent:"bg-gradient-to-r from-emerald-300 to-emerald-500",border:"border-emerald-200",tagBg:"bg-emerald-200",tagText:"text-emerald-800"},
  {id:"emerald-soft",name:"Emerald Soft",top:"bg-emerald-100",bottom:"bg-emerald-200",text:"text-emerald-900",subText:"text-emerald-700",accent:"bg-gradient-to-r from-emerald-400 to-emerald-600",border:"border-emerald-300",tagBg:"bg-emerald-300",tagText:"text-emerald-900"},
  {id:"emerald-medium",name:"Emerald Medium",top:"bg-emerald-500",bottom:"bg-emerald-600",text:"text-white",subText:"text-emerald-100",accent:"bg-gradient-to-r from-emerald-300 to-emerald-400",border:"border-emerald-700",tagBg:"bg-emerald-700",tagText:"text-emerald-100"},
  {id:"emerald-dark",name:"Emerald Dark",top:"bg-emerald-800",bottom:"bg-emerald-900",text:"text-emerald-50",subText:"text-emerald-300",accent:"bg-gradient-to-r from-emerald-400 to-emerald-600",border:"border-emerald-700",tagBg:"bg-emerald-700",tagText:"text-emerald-200"},
  {id:"emerald-deep",name:"Emerald Deep",top:"bg-emerald-900",bottom:"bg-emerald-950",text:"text-emerald-100",subText:"text-emerald-400",accent:"bg-gradient-to-r from-emerald-500 to-emerald-700",border:"border-emerald-800",tagBg:"bg-emerald-800",tagText:"text-emerald-300"},
  {id:"black-emerald",name:"Black & Emerald",top:"bg-black",bottom:"bg-emerald-950",text:"text-emerald-400",subText:"text-emerald-600",accent:"bg-gradient-to-r from-emerald-600 to-emerald-800",border:"border-emerald-900",tagBg:"bg-emerald-900",tagText:"text-emerald-500"},
  {id:"white-emerald",name:"White & Emerald",top:"bg-white",bottom:"bg-emerald-50",text:"text-emerald-600",subText:"text-emerald-400",accent:"bg-gradient-to-r from-emerald-200 to-emerald-400",border:"border-emerald-100",tagBg:"bg-emerald-100",tagText:"text-emerald-700"},
  {id:"emerald-gold",name:"Emerald & Gold",top:"bg-emerald-900",bottom:"bg-emerald-800",text:"text-yellow-500",subText:"text-emerald-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-emerald-700",tagBg:"bg-emerald-700",tagText:"text-yellow-400"},
  {id:"teal-light",name:"Teal Light",top:"bg-teal-50",bottom:"bg-teal-100",text:"text-teal-900",subText:"text-teal-600",accent:"bg-gradient-to-r from-teal-300 to-teal-500",border:"border-teal-200",tagBg:"bg-teal-200",tagText:"text-teal-800"},
  {id:"teal-soft",name:"Teal Soft",top:"bg-teal-100",bottom:"bg-teal-200",text:"text-teal-900",subText:"text-teal-700",accent:"bg-gradient-to-r from-teal-400 to-teal-600",border:"border-teal-300",tagBg:"bg-teal-300",tagText:"text-teal-900"},
  {id:"teal-medium",name:"Teal Medium",top:"bg-teal-500",bottom:"bg-teal-600",text:"text-white",subText:"text-teal-100",accent:"bg-gradient-to-r from-teal-300 to-teal-400",border:"border-teal-700",tagBg:"bg-teal-700",tagText:"text-teal-100"},
  {id:"teal-dark",name:"Teal Dark",top:"bg-teal-800",bottom:"bg-teal-900",text:"text-teal-50",subText:"text-teal-300",accent:"bg-gradient-to-r from-teal-400 to-teal-600",border:"border-teal-700",tagBg:"bg-teal-700",tagText:"text-teal-200"},
  {id:"teal-deep",name:"Teal Deep",top:"bg-teal-900",bottom:"bg-teal-950",text:"text-teal-100",subText:"text-teal-400",accent:"bg-gradient-to-r from-teal-500 to-teal-700",border:"border-teal-800",tagBg:"bg-teal-800",tagText:"text-teal-300"},
  {id:"black-teal",name:"Black & Teal",top:"bg-black",bottom:"bg-teal-950",text:"text-teal-400",subText:"text-teal-600",accent:"bg-gradient-to-r from-teal-600 to-teal-800",border:"border-teal-900",tagBg:"bg-teal-900",tagText:"text-teal-500"},
  {id:"white-teal",name:"White & Teal",top:"bg-white",bottom:"bg-teal-50",text:"text-teal-600",subText:"text-teal-400",accent:"bg-gradient-to-r from-teal-200 to-teal-400",border:"border-teal-100",tagBg:"bg-teal-100",tagText:"text-teal-700"},
  {id:"teal-gold",name:"Teal & Gold",top:"bg-teal-900",bottom:"bg-teal-800",text:"text-yellow-500",subText:"text-teal-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-teal-700",tagBg:"bg-teal-700",tagText:"text-yellow-400"},
  {id:"cyan-light",name:"Cyan Light",top:"bg-cyan-50",bottom:"bg-cyan-100",text:"text-cyan-900",subText:"text-cyan-600",accent:"bg-gradient-to-r from-cyan-300 to-cyan-500",border:"border-cyan-200",tagBg:"bg-cyan-200",tagText:"text-cyan-800"},
  {id:"cyan-soft",name:"Cyan Soft",top:"bg-cyan-100",bottom:"bg-cyan-200",text:"text-cyan-900",subText:"text-cyan-700",accent:"bg-gradient-to-r from-cyan-400 to-cyan-600",border:"border-cyan-300",tagBg:"bg-cyan-300",tagText:"text-cyan-900"},
  {id:"cyan-medium",name:"Cyan Medium",top:"bg-cyan-500",bottom:"bg-cyan-600",text:"text-white",subText:"text-cyan-100",accent:"bg-gradient-to-r from-cyan-300 to-cyan-400",border:"border-cyan-700",tagBg:"bg-cyan-700",tagText:"text-cyan-100"},
  {id:"cyan-dark",name:"Cyan Dark",top:"bg-cyan-800",bottom:"bg-cyan-900",text:"text-cyan-50",subText:"text-cyan-300",accent:"bg-gradient-to-r from-cyan-400 to-cyan-600",border:"border-cyan-700",tagBg:"bg-cyan-700",tagText:"text-cyan-200"},
  {id:"cyan-deep",name:"Cyan Deep",top:"bg-cyan-900",bottom:"bg-cyan-950",text:"text-cyan-100",subText:"text-cyan-400",accent:"bg-gradient-to-r from-cyan-500 to-cyan-700",border:"border-cyan-800",tagBg:"bg-cyan-800",tagText:"text-cyan-300"},
  {id:"black-cyan",name:"Black & Cyan",top:"bg-black",bottom:"bg-cyan-950",text:"text-cyan-400",subText:"text-cyan-600",accent:"bg-gradient-to-r from-cyan-600 to-cyan-800",border:"border-cyan-900",tagBg:"bg-cyan-900",tagText:"text-cyan-500"},
  {id:"white-cyan",name:"White & Cyan",top:"bg-white",bottom:"bg-cyan-50",text:"text-cyan-600",subText:"text-cyan-400",accent:"bg-gradient-to-r from-cyan-200 to-cyan-400",border:"border-cyan-100",tagBg:"bg-cyan-100",tagText:"text-cyan-700"},
  {id:"cyan-gold",name:"Cyan & Gold",top:"bg-cyan-900",bottom:"bg-cyan-800",text:"text-yellow-500",subText:"text-cyan-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-cyan-700",tagBg:"bg-cyan-700",tagText:"text-yellow-400"},
  {id:"sky-light",name:"Sky Light",top:"bg-sky-50",bottom:"bg-sky-100",text:"text-sky-900",subText:"text-sky-600",accent:"bg-gradient-to-r from-sky-300 to-sky-500",border:"border-sky-200",tagBg:"bg-sky-200",tagText:"text-sky-800"},
  {id:"sky-soft",name:"Sky Soft",top:"bg-sky-100",bottom:"bg-sky-200",text:"text-sky-900",subText:"text-sky-700",accent:"bg-gradient-to-r from-sky-400 to-sky-600",border:"border-sky-300",tagBg:"bg-sky-300",tagText:"text-sky-900"},
  {id:"sky-medium",name:"Sky Medium",top:"bg-sky-500",bottom:"bg-sky-600",text:"text-white",subText:"text-sky-100",accent:"bg-gradient-to-r from-sky-300 to-sky-400",border:"border-sky-700",tagBg:"bg-sky-700",tagText:"text-sky-100"},
  {id:"sky-dark",name:"Sky Dark",top:"bg-sky-800",bottom:"bg-sky-900",text:"text-sky-50",subText:"text-sky-300",accent:"bg-gradient-to-r from-sky-400 to-sky-600",border:"border-sky-700",tagBg:"bg-sky-700",tagText:"text-sky-200"},
  {id:"sky-deep",name:"Sky Deep",top:"bg-sky-900",bottom:"bg-sky-950",text:"text-sky-100",subText:"text-sky-400",accent:"bg-gradient-to-r from-sky-500 to-sky-700",border:"border-sky-800",tagBg:"bg-sky-800",tagText:"text-sky-300"},
  {id:"black-sky",name:"Black & Sky",top:"bg-black",bottom:"bg-sky-950",text:"text-sky-400",subText:"text-sky-600",accent:"bg-gradient-to-r from-sky-600 to-sky-800",border:"border-sky-900",tagBg:"bg-sky-900",tagText:"text-sky-500"},
  {id:"white-sky",name:"White & Sky",top:"bg-white",bottom:"bg-sky-50",text:"text-sky-600",subText:"text-sky-400",accent:"bg-gradient-to-r from-sky-200 to-sky-400",border:"border-sky-100",tagBg:"bg-sky-100",tagText:"text-sky-700"},
  {id:"sky-gold",name:"Sky & Gold",top:"bg-sky-900",bottom:"bg-sky-800",text:"text-yellow-500",subText:"text-sky-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-sky-700",tagBg:"bg-sky-700",tagText:"text-yellow-400"},
  {id:"blue-light",name:"Blue Light",top:"bg-blue-50",bottom:"bg-blue-100",text:"text-blue-900",subText:"text-blue-600",accent:"bg-gradient-to-r from-blue-300 to-blue-500",border:"border-blue-200",tagBg:"bg-blue-200",tagText:"text-blue-800"},
  {id:"blue-soft",name:"Blue Soft",top:"bg-blue-100",bottom:"bg-blue-200",text:"text-blue-900",subText:"text-blue-700",accent:"bg-gradient-to-r from-blue-400 to-blue-600",border:"border-blue-300",tagBg:"bg-blue-300",tagText:"text-blue-900"},
  {id:"blue-medium",name:"Blue Medium",top:"bg-blue-500",bottom:"bg-blue-600",text:"text-white",subText:"text-blue-100",accent:"bg-gradient-to-r from-blue-300 to-blue-400",border:"border-blue-700",tagBg:"bg-blue-700",tagText:"text-blue-100"},
  {id:"blue-dark",name:"Blue Dark",top:"bg-blue-800",bottom:"bg-blue-900",text:"text-blue-50",subText:"text-blue-300",accent:"bg-gradient-to-r from-blue-400 to-blue-600",border:"border-blue-700",tagBg:"bg-blue-700",tagText:"text-blue-200"},
  {id:"blue-deep",name:"Blue Deep",top:"bg-blue-900",bottom:"bg-blue-950",text:"text-blue-100",subText:"text-blue-400",accent:"bg-gradient-to-r from-blue-500 to-blue-700",border:"border-blue-800",tagBg:"bg-blue-800",tagText:"text-blue-300"},
  {id:"black-blue",name:"Black & Blue",top:"bg-black",bottom:"bg-blue-950",text:"text-blue-400",subText:"text-blue-600",accent:"bg-gradient-to-r from-blue-600 to-blue-800",border:"border-blue-900",tagBg:"bg-blue-900",tagText:"text-blue-500"},
  {id:"white-blue",name:"White & Blue",top:"bg-white",bottom:"bg-blue-50",text:"text-blue-600",subText:"text-blue-400",accent:"bg-gradient-to-r from-blue-200 to-blue-400",border:"border-blue-100",tagBg:"bg-blue-100",tagText:"text-blue-700"},
  {id:"blue-gold",name:"Blue & Gold",top:"bg-blue-900",bottom:"bg-blue-800",text:"text-yellow-500",subText:"text-blue-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-blue-700",tagBg:"bg-blue-700",tagText:"text-yellow-400"},
  {id:"indigo-light",name:"Indigo Light",top:"bg-indigo-50",bottom:"bg-indigo-100",text:"text-indigo-900",subText:"text-indigo-600",accent:"bg-gradient-to-r from-indigo-300 to-indigo-500",border:"border-indigo-200",tagBg:"bg-indigo-200",tagText:"text-indigo-800"},
  {id:"indigo-soft",name:"Indigo Soft",top:"bg-indigo-100",bottom:"bg-indigo-200",text:"text-indigo-900",subText:"text-indigo-700",accent:"bg-gradient-to-r from-indigo-400 to-indigo-600",border:"border-indigo-300",tagBg:"bg-indigo-300",tagText:"text-indigo-900"},
  {id:"indigo-medium",name:"Indigo Medium",top:"bg-indigo-500",bottom:"bg-indigo-600",text:"text-white",subText:"text-indigo-100",accent:"bg-gradient-to-r from-indigo-300 to-indigo-400",border:"border-indigo-700",tagBg:"bg-indigo-700",tagText:"text-indigo-100"},
  {id:"indigo-dark",name:"Indigo Dark",top:"bg-indigo-800",bottom:"bg-indigo-900",text:"text-indigo-50",subText:"text-indigo-300",accent:"bg-gradient-to-r from-indigo-400 to-indigo-600",border:"border-indigo-700",tagBg:"bg-indigo-700",tagText:"text-indigo-200"},
  {id:"indigo-deep",name:"Indigo Deep",top:"bg-indigo-900",bottom:"bg-indigo-950",text:"text-indigo-100",subText:"text-indigo-400",accent:"bg-gradient-to-r from-indigo-500 to-indigo-700",border:"border-indigo-800",tagBg:"bg-indigo-800",tagText:"text-indigo-300"},
  {id:"black-indigo",name:"Black & Indigo",top:"bg-black",bottom:"bg-indigo-950",text:"text-indigo-400",subText:"text-indigo-600",accent:"bg-gradient-to-r from-indigo-600 to-indigo-800",border:"border-indigo-900",tagBg:"bg-indigo-900",tagText:"text-indigo-500"},
  {id:"white-indigo",name:"White & Indigo",top:"bg-white",bottom:"bg-indigo-50",text:"text-indigo-600",subText:"text-indigo-400",accent:"bg-gradient-to-r from-indigo-200 to-indigo-400",border:"border-indigo-100",tagBg:"bg-indigo-100",tagText:"text-indigo-700"},
  {id:"indigo-gold",name:"Indigo & Gold",top:"bg-indigo-900",bottom:"bg-indigo-800",text:"text-yellow-500",subText:"text-indigo-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-indigo-700",tagBg:"bg-indigo-700",tagText:"text-yellow-400"},
  {id:"violet-light",name:"Violet Light",top:"bg-violet-50",bottom:"bg-violet-100",text:"text-violet-900",subText:"text-violet-600",accent:"bg-gradient-to-r from-violet-300 to-violet-500",border:"border-violet-200",tagBg:"bg-violet-200",tagText:"text-violet-800"},
  {id:"violet-soft",name:"Violet Soft",top:"bg-violet-100",bottom:"bg-violet-200",text:"text-violet-900",subText:"text-violet-700",accent:"bg-gradient-to-r from-violet-400 to-violet-600",border:"border-violet-300",tagBg:"bg-violet-300",tagText:"text-violet-900"},
  {id:"violet-medium",name:"Violet Medium",top:"bg-violet-500",bottom:"bg-violet-600",text:"text-white",subText:"text-violet-100",accent:"bg-gradient-to-r from-violet-300 to-violet-400",border:"border-violet-700",tagBg:"bg-violet-700",tagText:"text-violet-100"},
  {id:"violet-dark",name:"Violet Dark",top:"bg-violet-800",bottom:"bg-violet-900",text:"text-violet-50",subText:"text-violet-300",accent:"bg-gradient-to-r from-violet-400 to-violet-600",border:"border-violet-700",tagBg:"bg-violet-700",tagText:"text-violet-200"},
  {id:"violet-deep",name:"Violet Deep",top:"bg-violet-900",bottom:"bg-violet-950",text:"text-violet-100",subText:"text-violet-400",accent:"bg-gradient-to-r from-violet-500 to-violet-700",border:"border-violet-800",tagBg:"bg-violet-800",tagText:"text-violet-300"},
  {id:"black-violet",name:"Black & Violet",top:"bg-black",bottom:"bg-violet-950",text:"text-violet-400",subText:"text-violet-600",accent:"bg-gradient-to-r from-violet-600 to-violet-800",border:"border-violet-900",tagBg:"bg-violet-900",tagText:"text-violet-500"},
  {id:"white-violet",name:"White & Violet",top:"bg-white",bottom:"bg-violet-50",text:"text-violet-600",subText:"text-violet-400",accent:"bg-gradient-to-r from-violet-200 to-violet-400",border:"border-violet-100",tagBg:"bg-violet-100",tagText:"text-violet-700"},
  {id:"violet-gold",name:"Violet & Gold",top:"bg-violet-900",bottom:"bg-violet-800",text:"text-yellow-500",subText:"text-violet-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-violet-700",tagBg:"bg-violet-700",tagText:"text-yellow-400"},
  {id:"purple-light",name:"Purple Light",top:"bg-purple-50",bottom:"bg-purple-100",text:"text-purple-900",subText:"text-purple-600",accent:"bg-gradient-to-r from-purple-300 to-purple-500",border:"border-purple-200",tagBg:"bg-purple-200",tagText:"text-purple-800"},
  {id:"purple-soft",name:"Purple Soft",top:"bg-purple-100",bottom:"bg-purple-200",text:"text-purple-900",subText:"text-purple-700",accent:"bg-gradient-to-r from-purple-400 to-purple-600",border:"border-purple-300",tagBg:"bg-purple-300",tagText:"text-purple-900"},
  {id:"purple-medium",name:"Purple Medium",top:"bg-purple-500",bottom:"bg-purple-600",text:"text-white",subText:"text-purple-100",accent:"bg-gradient-to-r from-purple-300 to-purple-400",border:"border-purple-700",tagBg:"bg-purple-700",tagText:"text-purple-100"},
  {id:"purple-dark",name:"Purple Dark",top:"bg-purple-800",bottom:"bg-purple-900",text:"text-purple-50",subText:"text-purple-300",accent:"bg-gradient-to-r from-purple-400 to-purple-600",border:"border-purple-700",tagBg:"bg-purple-700",tagText:"text-purple-200"},
  {id:"purple-deep",name:"Purple Deep",top:"bg-purple-900",bottom:"bg-purple-950",text:"text-purple-100",subText:"text-purple-400",accent:"bg-gradient-to-r from-purple-500 to-purple-700",border:"border-purple-800",tagBg:"bg-purple-800",tagText:"text-purple-300"},
  {id:"black-purple",name:"Black & Purple",top:"bg-black",bottom:"bg-purple-950",text:"text-purple-400",subText:"text-purple-600",accent:"bg-gradient-to-r from-purple-600 to-purple-800",border:"border-purple-900",tagBg:"bg-purple-900",tagText:"text-purple-500"},
  {id:"white-purple",name:"White & Purple",top:"bg-white",bottom:"bg-purple-50",text:"text-purple-600",subText:"text-purple-400",accent:"bg-gradient-to-r from-purple-200 to-purple-400",border:"border-purple-100",tagBg:"bg-purple-100",tagText:"text-purple-700"},
  {id:"purple-gold",name:"Purple & Gold",top:"bg-purple-900",bottom:"bg-purple-800",text:"text-yellow-500",subText:"text-purple-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-purple-700",tagBg:"bg-purple-700",tagText:"text-yellow-400"},
  {id:"fuchsia-light",name:"Fuchsia Light",top:"bg-fuchsia-50",bottom:"bg-fuchsia-100",text:"text-fuchsia-900",subText:"text-fuchsia-600",accent:"bg-gradient-to-r from-fuchsia-300 to-fuchsia-500",border:"border-fuchsia-200",tagBg:"bg-fuchsia-200",tagText:"text-fuchsia-800"},
  {id:"fuchsia-soft",name:"Fuchsia Soft",top:"bg-fuchsia-100",bottom:"bg-fuchsia-200",text:"text-fuchsia-900",subText:"text-fuchsia-700",accent:"bg-gradient-to-r from-fuchsia-400 to-fuchsia-600",border:"border-fuchsia-300",tagBg:"bg-fuchsia-300",tagText:"text-fuchsia-900"},
  {id:"fuchsia-medium",name:"Fuchsia Medium",top:"bg-fuchsia-500",bottom:"bg-fuchsia-600",text:"text-white",subText:"text-fuchsia-100",accent:"bg-gradient-to-r from-fuchsia-300 to-fuchsia-400",border:"border-fuchsia-700",tagBg:"bg-fuchsia-700",tagText:"text-fuchsia-100"},
  {id:"fuchsia-dark",name:"Fuchsia Dark",top:"bg-fuchsia-800",bottom:"bg-fuchsia-900",text:"text-fuchsia-50",subText:"text-fuchsia-300",accent:"bg-gradient-to-r from-fuchsia-400 to-fuchsia-600",border:"border-fuchsia-700",tagBg:"bg-fuchsia-700",tagText:"text-fuchsia-200"},
  {id:"fuchsia-deep",name:"Fuchsia Deep",top:"bg-fuchsia-900",bottom:"bg-fuchsia-950",text:"text-fuchsia-100",subText:"text-fuchsia-400",accent:"bg-gradient-to-r from-fuchsia-500 to-fuchsia-700",border:"border-fuchsia-800",tagBg:"bg-fuchsia-800",tagText:"text-fuchsia-300"},
  {id:"black-fuchsia",name:"Black & Fuchsia",top:"bg-black",bottom:"bg-fuchsia-950",text:"text-fuchsia-400",subText:"text-fuchsia-600",accent:"bg-gradient-to-r from-fuchsia-600 to-fuchsia-800",border:"border-fuchsia-900",tagBg:"bg-fuchsia-900",tagText:"text-fuchsia-500"},
  {id:"white-fuchsia",name:"White & Fuchsia",top:"bg-white",bottom:"bg-fuchsia-50",text:"text-fuchsia-600",subText:"text-fuchsia-400",accent:"bg-gradient-to-r from-fuchsia-200 to-fuchsia-400",border:"border-fuchsia-100",tagBg:"bg-fuchsia-100",tagText:"text-fuchsia-700"},
  {id:"fuchsia-gold",name:"Fuchsia & Gold",top:"bg-fuchsia-900",bottom:"bg-fuchsia-800",text:"text-yellow-500",subText:"text-fuchsia-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-fuchsia-700",tagBg:"bg-fuchsia-700",tagText:"text-yellow-400"},
  {id:"pink-light",name:"Pink Light",top:"bg-pink-50",bottom:"bg-pink-100",text:"text-pink-900",subText:"text-pink-600",accent:"bg-gradient-to-r from-pink-300 to-pink-500",border:"border-pink-200",tagBg:"bg-pink-200",tagText:"text-pink-800"},
  {id:"pink-soft",name:"Pink Soft",top:"bg-pink-100",bottom:"bg-pink-200",text:"text-pink-900",subText:"text-pink-700",accent:"bg-gradient-to-r from-pink-400 to-pink-600",border:"border-pink-300",tagBg:"bg-pink-300",tagText:"text-pink-900"},
  {id:"pink-medium",name:"Pink Medium",top:"bg-pink-500",bottom:"bg-pink-600",text:"text-white",subText:"text-pink-100",accent:"bg-gradient-to-r from-pink-300 to-pink-400",border:"border-pink-700",tagBg:"bg-pink-700",tagText:"text-pink-100"},
  {id:"pink-dark",name:"Pink Dark",top:"bg-pink-800",bottom:"bg-pink-900",text:"text-pink-50",subText:"text-pink-300",accent:"bg-gradient-to-r from-pink-400 to-pink-600",border:"border-pink-700",tagBg:"bg-pink-700",tagText:"text-pink-200"},
  {id:"pink-deep",name:"Pink Deep",top:"bg-pink-900",bottom:"bg-pink-950",text:"text-pink-100",subText:"text-pink-400",accent:"bg-gradient-to-r from-pink-500 to-pink-700",border:"border-pink-800",tagBg:"bg-pink-800",tagText:"text-pink-300"},
  {id:"black-pink",name:"Black & Pink",top:"bg-black",bottom:"bg-pink-950",text:"text-pink-400",subText:"text-pink-600",accent:"bg-gradient-to-r from-pink-600 to-pink-800",border:"border-pink-900",tagBg:"bg-pink-900",tagText:"text-pink-500"},
  {id:"white-pink",name:"White & Pink",top:"bg-white",bottom:"bg-pink-50",text:"text-pink-600",subText:"text-pink-400",accent:"bg-gradient-to-r from-pink-200 to-pink-400",border:"border-pink-100",tagBg:"bg-pink-100",tagText:"text-pink-700"},
  {id:"pink-gold",name:"Pink & Gold",top:"bg-pink-900",bottom:"bg-pink-800",text:"text-yellow-500",subText:"text-pink-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-pink-700",tagBg:"bg-pink-700",tagText:"text-yellow-400"},
  {id:"rose-light",name:"Rose Light",top:"bg-rose-50",bottom:"bg-rose-100",text:"text-rose-900",subText:"text-rose-600",accent:"bg-gradient-to-r from-rose-300 to-rose-500",border:"border-rose-200",tagBg:"bg-rose-200",tagText:"text-rose-800"},
  {id:"rose-soft",name:"Rose Soft",top:"bg-rose-100",bottom:"bg-rose-200",text:"text-rose-900",subText:"text-rose-700",accent:"bg-gradient-to-r from-rose-400 to-rose-600",border:"border-rose-300",tagBg:"bg-rose-300",tagText:"text-rose-900"},
  {id:"rose-medium",name:"Rose Medium",top:"bg-rose-500",bottom:"bg-rose-600",text:"text-white",subText:"text-rose-100",accent:"bg-gradient-to-r from-rose-300 to-rose-400",border:"border-rose-700",tagBg:"bg-rose-700",tagText:"text-rose-100"},
  {id:"rose-dark",name:"Rose Dark",top:"bg-rose-800",bottom:"bg-rose-900",text:"text-rose-50",subText:"text-rose-300",accent:"bg-gradient-to-r from-rose-400 to-rose-600",border:"border-rose-700",tagBg:"bg-rose-700",tagText:"text-rose-200"},
  {id:"rose-deep",name:"Rose Deep",top:"bg-rose-900",bottom:"bg-rose-950",text:"text-rose-100",subText:"text-rose-400",accent:"bg-gradient-to-r from-rose-500 to-rose-700",border:"border-rose-800",tagBg:"bg-rose-800",tagText:"text-rose-300"},
  {id:"black-rose",name:"Black & Rose",top:"bg-black",bottom:"bg-rose-950",text:"text-rose-400",subText:"text-rose-600",accent:"bg-gradient-to-r from-rose-600 to-rose-800",border:"border-rose-900",tagBg:"bg-rose-900",tagText:"text-rose-500"},
  {id:"white-rose",name:"White & Rose",top:"bg-white",bottom:"bg-rose-50",text:"text-rose-600",subText:"text-rose-400",accent:"bg-gradient-to-r from-rose-200 to-rose-400",border:"border-rose-100",tagBg:"bg-rose-100",tagText:"text-rose-700"},
  {id:"rose-gold",name:"Rose & Gold",top:"bg-rose-900",bottom:"bg-rose-800",text:"text-yellow-500",subText:"text-rose-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-rose-700",tagBg:"bg-rose-700",tagText:"text-yellow-400"},
  {id:"slate-light",name:"Slate Light",top:"bg-slate-50",bottom:"bg-slate-100",text:"text-slate-900",subText:"text-slate-600",accent:"bg-gradient-to-r from-slate-300 to-slate-500",border:"border-slate-200",tagBg:"bg-slate-200",tagText:"text-slate-800"},
  {id:"slate-soft",name:"Slate Soft",top:"bg-slate-100",bottom:"bg-slate-200",text:"text-slate-900",subText:"text-slate-700",accent:"bg-gradient-to-r from-slate-400 to-slate-600",border:"border-slate-300",tagBg:"bg-slate-300",tagText:"text-slate-900"},
  {id:"slate-medium",name:"Slate Medium",top:"bg-slate-500",bottom:"bg-slate-600",text:"text-white",subText:"text-slate-100",accent:"bg-gradient-to-r from-slate-300 to-slate-400",border:"border-slate-700",tagBg:"bg-slate-700",tagText:"text-slate-100"},
  {id:"slate-dark",name:"Slate Dark",top:"bg-slate-800",bottom:"bg-slate-900",text:"text-slate-50",subText:"text-slate-300",accent:"bg-gradient-to-r from-slate-400 to-slate-600",border:"border-slate-700",tagBg:"bg-slate-700",tagText:"text-slate-200"},
  {id:"slate-deep",name:"Slate Deep",top:"bg-slate-900",bottom:"bg-slate-950",text:"text-slate-100",subText:"text-slate-400",accent:"bg-gradient-to-r from-slate-500 to-slate-700",border:"border-slate-800",tagBg:"bg-slate-800",tagText:"text-slate-300"},
  {id:"black-slate",name:"Black & Slate",top:"bg-black",bottom:"bg-slate-950",text:"text-slate-400",subText:"text-slate-600",accent:"bg-gradient-to-r from-slate-600 to-slate-800",border:"border-slate-900",tagBg:"bg-slate-900",tagText:"text-slate-500"},
  {id:"white-slate",name:"White & Slate",top:"bg-white",bottom:"bg-slate-50",text:"text-slate-600",subText:"text-slate-400",accent:"bg-gradient-to-r from-slate-200 to-slate-400",border:"border-slate-100",tagBg:"bg-slate-100",tagText:"text-slate-700"},
  {id:"slate-gold",name:"Slate & Gold",top:"bg-slate-900",bottom:"bg-slate-800",text:"text-yellow-500",subText:"text-slate-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-slate-700",tagBg:"bg-slate-700",tagText:"text-yellow-400"},
  {id:"gray-light",name:"Gray Light",top:"bg-gray-50",bottom:"bg-gray-100",text:"text-gray-900",subText:"text-gray-600",accent:"bg-gradient-to-r from-gray-300 to-gray-500",border:"border-gray-200",tagBg:"bg-gray-200",tagText:"text-gray-800"},
  {id:"gray-soft",name:"Gray Soft",top:"bg-gray-100",bottom:"bg-gray-200",text:"text-gray-900",subText:"text-gray-700",accent:"bg-gradient-to-r from-gray-400 to-gray-600",border:"border-gray-300",tagBg:"bg-gray-300",tagText:"text-gray-900"},
  {id:"gray-medium",name:"Gray Medium",top:"bg-gray-500",bottom:"bg-gray-600",text:"text-white",subText:"text-gray-100",accent:"bg-gradient-to-r from-gray-300 to-gray-400",border:"border-gray-700",tagBg:"bg-gray-700",tagText:"text-gray-100"},
  {id:"gray-dark",name:"Gray Dark",top:"bg-gray-800",bottom:"bg-gray-900",text:"text-gray-50",subText:"text-gray-300",accent:"bg-gradient-to-r from-gray-400 to-gray-600",border:"border-gray-700",tagBg:"bg-gray-700",tagText:"text-gray-200"},
  {id:"gray-deep",name:"Gray Deep",top:"bg-gray-900",bottom:"bg-gray-950",text:"text-gray-100",subText:"text-gray-400",accent:"bg-gradient-to-r from-gray-500 to-gray-700",border:"border-gray-800",tagBg:"bg-gray-800",tagText:"text-gray-300"},
  {id:"black-gray",name:"Black & Gray",top:"bg-black",bottom:"bg-gray-950",text:"text-gray-400",subText:"text-gray-600",accent:"bg-gradient-to-r from-gray-600 to-gray-800",border:"border-gray-900",tagBg:"bg-gray-900",tagText:"text-gray-500"},
  {id:"white-gray",name:"White & Gray",top:"bg-white",bottom:"bg-gray-50",text:"text-gray-600",subText:"text-gray-400",accent:"bg-gradient-to-r from-gray-200 to-gray-400",border:"border-gray-100",tagBg:"bg-gray-100",tagText:"text-gray-700"},
  {id:"gray-gold",name:"Gray & Gold",top:"bg-gray-900",bottom:"bg-gray-800",text:"text-yellow-500",subText:"text-gray-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-gray-700",tagBg:"bg-gray-700",tagText:"text-yellow-400"},
  {id:"zinc-light",name:"Zinc Light",top:"bg-zinc-50",bottom:"bg-zinc-100",text:"text-zinc-900",subText:"text-zinc-600",accent:"bg-gradient-to-r from-zinc-300 to-zinc-500",border:"border-zinc-200",tagBg:"bg-zinc-200",tagText:"text-zinc-800"},
  {id:"zinc-soft",name:"Zinc Soft",top:"bg-zinc-100",bottom:"bg-zinc-200",text:"text-zinc-900",subText:"text-zinc-700",accent:"bg-gradient-to-r from-zinc-400 to-zinc-600",border:"border-zinc-300",tagBg:"bg-zinc-300",tagText:"text-zinc-900"},
  {id:"zinc-medium",name:"Zinc Medium",top:"bg-zinc-500",bottom:"bg-zinc-600",text:"text-white",subText:"text-zinc-100",accent:"bg-gradient-to-r from-zinc-300 to-zinc-400",border:"border-zinc-700",tagBg:"bg-zinc-700",tagText:"text-zinc-100"},
  {id:"zinc-dark",name:"Zinc Dark",top:"bg-zinc-800",bottom:"bg-zinc-900",text:"text-zinc-50",subText:"text-zinc-300",accent:"bg-gradient-to-r from-zinc-400 to-zinc-600",border:"border-zinc-700",tagBg:"bg-zinc-700",tagText:"text-zinc-200"},
  {id:"zinc-deep",name:"Zinc Deep",top:"bg-zinc-900",bottom:"bg-zinc-950",text:"text-zinc-100",subText:"text-zinc-400",accent:"bg-gradient-to-r from-zinc-500 to-zinc-700",border:"border-zinc-800",tagBg:"bg-zinc-800",tagText:"text-zinc-300"},
  {id:"black-zinc",name:"Black & Zinc",top:"bg-black",bottom:"bg-zinc-950",text:"text-zinc-400",subText:"text-zinc-600",accent:"bg-gradient-to-r from-zinc-600 to-zinc-800",border:"border-zinc-900",tagBg:"bg-zinc-900",tagText:"text-zinc-500"},
  {id:"white-zinc",name:"White & Zinc",top:"bg-white",bottom:"bg-zinc-50",text:"text-zinc-600",subText:"text-zinc-400",accent:"bg-gradient-to-r from-zinc-200 to-zinc-400",border:"border-zinc-100",tagBg:"bg-zinc-100",tagText:"text-zinc-700"},
  {id:"zinc-gold",name:"Zinc & Gold",top:"bg-zinc-900",bottom:"bg-zinc-800",text:"text-yellow-500",subText:"text-zinc-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-zinc-700",tagBg:"bg-zinc-700",tagText:"text-yellow-400"},
  {id:"neutral-light",name:"Neutral Light",top:"bg-neutral-50",bottom:"bg-neutral-100",text:"text-neutral-900",subText:"text-neutral-600",accent:"bg-gradient-to-r from-neutral-300 to-neutral-500",border:"border-neutral-200",tagBg:"bg-neutral-200",tagText:"text-neutral-800"},
  {id:"neutral-soft",name:"Neutral Soft",top:"bg-neutral-100",bottom:"bg-neutral-200",text:"text-neutral-900",subText:"text-neutral-700",accent:"bg-gradient-to-r from-neutral-400 to-neutral-600",border:"border-neutral-300",tagBg:"bg-neutral-300",tagText:"text-neutral-900"},
  {id:"neutral-medium",name:"Neutral Medium",top:"bg-neutral-500",bottom:"bg-neutral-600",text:"text-white",subText:"text-neutral-100",accent:"bg-gradient-to-r from-neutral-300 to-neutral-400",border:"border-neutral-700",tagBg:"bg-neutral-700",tagText:"text-neutral-100"},
  {id:"neutral-dark",name:"Neutral Dark",top:"bg-neutral-800",bottom:"bg-neutral-900",text:"text-neutral-50",subText:"text-neutral-300",accent:"bg-gradient-to-r from-neutral-400 to-neutral-600",border:"border-neutral-700",tagBg:"bg-neutral-700",tagText:"text-neutral-200"},
  {id:"neutral-deep",name:"Neutral Deep",top:"bg-neutral-900",bottom:"bg-neutral-950",text:"text-neutral-100",subText:"text-neutral-400",accent:"bg-gradient-to-r from-neutral-500 to-neutral-700",border:"border-neutral-800",tagBg:"bg-neutral-800",tagText:"text-neutral-300"},
  {id:"black-neutral",name:"Black & Neutral",top:"bg-black",bottom:"bg-neutral-950",text:"text-neutral-400",subText:"text-neutral-600",accent:"bg-gradient-to-r from-neutral-600 to-neutral-800",border:"border-neutral-900",tagBg:"bg-neutral-900",tagText:"text-neutral-500"},
  {id:"white-neutral",name:"White & Neutral",top:"bg-white",bottom:"bg-neutral-50",text:"text-neutral-600",subText:"text-neutral-400",accent:"bg-gradient-to-r from-neutral-200 to-neutral-400",border:"border-neutral-100",tagBg:"bg-neutral-100",tagText:"text-neutral-700"},
  {id:"neutral-gold",name:"Neutral & Gold",top:"bg-neutral-900",bottom:"bg-neutral-800",text:"text-yellow-500",subText:"text-neutral-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-neutral-700",tagBg:"bg-neutral-700",tagText:"text-yellow-400"},
  {id:"stone-light",name:"Stone Light",top:"bg-stone-50",bottom:"bg-stone-100",text:"text-stone-900",subText:"text-stone-600",accent:"bg-gradient-to-r from-stone-300 to-stone-500",border:"border-stone-200",tagBg:"bg-stone-200",tagText:"text-stone-800"},
  {id:"stone-soft",name:"Stone Soft",top:"bg-stone-100",bottom:"bg-stone-200",text:"text-stone-900",subText:"text-stone-700",accent:"bg-gradient-to-r from-stone-400 to-stone-600",border:"border-stone-300",tagBg:"bg-stone-300",tagText:"text-stone-900"},
  {id:"stone-medium",name:"Stone Medium",top:"bg-stone-500",bottom:"bg-stone-600",text:"text-white",subText:"text-stone-100",accent:"bg-gradient-to-r from-stone-300 to-stone-400",border:"border-stone-700",tagBg:"bg-stone-700",tagText:"text-stone-100"},
  {id:"stone-dark",name:"Stone Dark",top:"bg-stone-800",bottom:"bg-stone-900",text:"text-stone-50",subText:"text-stone-300",accent:"bg-gradient-to-r from-stone-400 to-stone-600",border:"border-stone-700",tagBg:"bg-stone-700",tagText:"text-stone-200"},
  {id:"stone-deep",name:"Stone Deep",top:"bg-stone-900",bottom:"bg-stone-950",text:"text-stone-100",subText:"text-stone-400",accent:"bg-gradient-to-r from-stone-500 to-stone-700",border:"border-stone-800",tagBg:"bg-stone-800",tagText:"text-stone-300"},
  {id:"black-stone",name:"Black & Stone",top:"bg-black",bottom:"bg-stone-950",text:"text-stone-400",subText:"text-stone-600",accent:"bg-gradient-to-r from-stone-600 to-stone-800",border:"border-stone-900",tagBg:"bg-stone-900",tagText:"text-stone-500"},
  {id:"white-stone",name:"White & Stone",top:"bg-white",bottom:"bg-stone-50",text:"text-stone-600",subText:"text-stone-400",accent:"bg-gradient-to-r from-stone-200 to-stone-400",border:"border-stone-100",tagBg:"bg-stone-100",tagText:"text-stone-700"},
  {id:"stone-gold",name:"Stone & Gold",top:"bg-stone-900",bottom:"bg-stone-800",text:"text-yellow-500",subText:"text-stone-300",accent:"bg-gradient-to-r from-yellow-400 to-yellow-600",border:"border-stone-700",tagBg:"bg-stone-700",tagText:"text-yellow-400"}
];

// Helper to migrate old string data to array
const migrateToArray = (val: string | string[] | undefined): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val.split(',').map(s => s.trim()).filter(Boolean);
};

// TagInput Component
function TagInput({ 
  tags, 
  setTags, 
  suggestions, 
  placeholder 
}: { 
  tags: string[], 
  setTags: (t: string[]) => void, 
  suggestions: string[], 
  placeholder: string 
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '.') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 p-2 border border-app-border rounded-md focus-within:ring-1 focus-within:ring-app-accent focus-within:border-app-accent bg-app-bg min-h-[42px]">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-app-accent/10 text-app-accent text-sm rounded-md border border-app-accent/20">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-app-accent hover:text-app-accent-hover p-0.5 rounded-full hover:bg-app-accent/20 transition-colors">
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => {
            const val = e.target.value;
            if (val.endsWith(',') || val.endsWith('.')) {
              addTag(val.slice(0, -1));
            } else {
              setInput(val);
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent text-app-text placeholder:text-app-muted"
        />
      </div>
      {showSuggestions && input && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-app-card border border-app-border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.map(s => (
            <li 
              key={s} 
              className="px-3 py-2 text-sm cursor-pointer hover:bg-app-bg text-app-text"
              onClick={() => addTag(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// RGBInput Component
function RGBInput({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) {
  // hex to rgb
  const r = parseInt(value.slice(1, 3), 16) || 0;
  const g = parseInt(value.slice(3, 5), 16) || 0;
  const b = parseInt(value.slice(5, 7), 16) || 0;

  const handleRGBChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const clamped = Math.max(0, Math.min(255, val));
    let nr = r, ng = g, nb = b;
    if (channel === 'r') nr = clamped;
    if (channel === 'g') ng = clamped;
    if (channel === 'b') nb = clamped;
    
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    onChange(`#${toHex(nr)}${toHex(ng)}${toHex(nb)}`);
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-app-muted uppercase">{label}</label>
      <div className="flex items-center gap-2">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-app-border bg-transparent"
        />
        <div className="flex gap-1">
          {['r', 'g', 'b'].map((c) => (
            <div key={c} className="flex flex-col items-center">
              <input 
                type="number"
                min="0"
                max="255"
                value={c === 'r' ? r : c === 'g' ? g : b}
                onChange={(e) => handleRGBChange(c as any, parseInt(e.target.value) || 0)}
                className="w-12 px-1 py-1 text-xs border border-app-border bg-app-bg text-app-text rounded text-center focus:ring-1 focus:ring-app-accent outline-none"
              />
              <span className="text-[8px] uppercase text-app-muted">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FragranceDatabase({ fragrances, setFragrances, userThemes = [], setUserThemes }: Props) {
  const [viewState, setViewState] = useState<'list' | 'detail' | 'edit'>('list');
  const [selectedFragrance, setSelectedFragrance] = useState<Fragrance | null>(null);
  const [currentFragrance, setCurrentFragrance] = useState<Partial<Fragrance>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'tag' | 'notes'>('name');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const [customThemeEditor, setCustomThemeEditor] = useState<{
    fragranceId: string;
    themeId?: string;
    name: string;
    color1: string;
    color2: string;
    isGradient: boolean;
    gradientDirection: 'to right' | 'to bottom' | 'to bottom right' | 'to top right';
    textColor: string;
    accentColor: string;
    nameText: string;
    houseText: string;
    inspiredText: string;
    tagText: string;
    tagBg: string;
  } | null>(null);

  const { confirm, ConfirmModal } = useConfirm();

  const tutorialSteps = [
    {
      title: 'Fragrance Database',
      content: 'Store and organize all your finished perfume creations or purchased oils here.',
      icon: <Database size={40} />
    },
    {
      title: 'Custom Themes',
      content: 'Every fragrance can have its own unique visual style. Click the palette icon when editing to choose from over 50+ designer themes.',
      icon: <Palette size={40} />
    },
    {
      title: 'Detailed Profiles',
      content: 'Track scent profiles (Top, Heart, Base notes), longevity, sillage, and gender leanings for every entry.',
      icon: <Eye size={40} />
    },
    {
      title: 'Organization',
      content: 'Use the search bar and sorting arrows to keep your collection organized. You can also duplicate existing entries to save time.',
      icon: <Layout size={40} />
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fragrance-menu-container')) {
        setOpenMenuId(null);
        setShowColorPicker(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const duplicateFragrance = (fragrance: Fragrance) => {
    const newFragrance: Fragrance = {
      ...fragrance,
      id: crypto.randomUUID(),
      name: `${fragrance.name} (Copy)`,
    };
    setFragrances([...fragrances, newFragrance]);
  };

  const deleteSelectedFragrances = () => {
    confirm('Delete Fragrances', `Are you sure you want to delete ${selectedIds.length} selected fragrances?`, () => {
      setFragrances(fragrances.filter(f => !selectedIds.includes(f.id)));
      setSelectedIds([]);
      setIsSelectionMode(false);
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const moveFragrance = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = fragrances.findIndex(f => f.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fragrances.length - 1) return;
    
    const newFragrances = [...fragrances];
    const temp = newFragrances[index];
    newFragrances[index] = newFragrances[index + (direction === 'up' ? -1 : 1)];
    newFragrances[index + (direction === 'up' ? -1 : 1)] = temp;
    
    setFragrances(newFragrances);
  };

  const changeColorTheme = (id: string, themeId: string, customTheme?: UserTheme) => {
    setFragrances(fragrances.map(f => f.id === id ? { ...f, colorTheme: themeId, customTheme } : f));
    if (selectedFragrance?.id === id) {
      setSelectedFragrance({ ...selectedFragrance, colorTheme: themeId, customTheme });
    }
  };

  const tailwindToHex = (twClass: string): string => {
    if (!twClass) return '#ffffff';
    if (twClass.startsWith('#')) return twClass;
    
    // Handle gradients
    if (twClass.includes('from-')) {
      const match = twClass.match(/from-([a-z0-9-]+)/);
      if (match) {
        return tailwindToHex(`bg-${match[1]}`);
      }
    }

    const colorMap: Record<string, string> = {
      'bg-app-bg': 'var(--bg-app)',
      'bg-app-card': 'var(--bg-card)',
      'bg-app-text': 'var(--text-main)',
      'bg-app-muted': 'var(--text-muted)',
      'bg-app-accent': 'var(--accent)',
      'bg-app-border': 'var(--border)',
      'bg-yellow-50': '#fefce8', 'bg-yellow-100': '#fef9c3', 'bg-yellow-200': '#fef08a', 'bg-yellow-300': '#fde047', 'bg-yellow-400': '#facc15', 'bg-yellow-500': '#eab308', 'bg-yellow-600': '#ca8a04', 'bg-yellow-700': '#a16207', 'bg-yellow-800': '#854d0e', 'bg-yellow-900': '#713f12', 'bg-yellow-950': '#422006',
      'bg-lime-50': '#f7fee7', 'bg-lime-100': '#ecfccb', 'bg-lime-200': '#d9f99d', 'bg-lime-300': '#bef264', 'bg-lime-400': '#a3e635', 'bg-lime-500': '#84cc16', 'bg-lime-600': '#65a30d', 'bg-lime-700': '#4d7c0f', 'bg-lime-800': '#3f6212', 'bg-lime-900': '#365314', 'bg-lime-950': '#1a2e05',
      'bg-green-50': '#f0fdf4', 'bg-green-100': '#dcfce7', 'bg-green-200': '#bbf7d0', 'bg-green-300': '#86efac', 'bg-green-400': '#4ade80', 'bg-green-500': '#22c55e', 'bg-green-600': '#16a34a', 'bg-green-700': '#15803d', 'bg-green-800': '#166534', 'bg-green-900': '#14532d', 'bg-green-950': '#052e16',
      'bg-emerald-50': '#ecfdf5', 'bg-emerald-100': '#d1fae5', 'bg-emerald-200': '#a7f3d0', 'bg-emerald-300': '#6ee7b7', 'bg-emerald-400': '#34d399', 'bg-emerald-500': '#10b981', 'bg-emerald-600': '#059669', 'bg-emerald-700': '#047857', 'bg-emerald-800': '#065f46', 'bg-emerald-900': '#064e3b', 'bg-emerald-950': '#022c22',
      'bg-teal-50': '#f0fdfa', 'bg-teal-100': '#ccfbf1', 'bg-teal-200': '#99f6e4', 'bg-teal-300': '#5eead4', 'bg-teal-400': '#2dd4bf', 'bg-teal-500': '#14b8a6', 'bg-teal-600': '#0d9488', 'bg-teal-700': '#0f766e', 'bg-teal-800': '#115e59', 'bg-teal-900': '#134e4a', 'bg-teal-950': '#042f2e',
      'bg-cyan-50': '#ecfeff', 'bg-cyan-100': '#cffafe', 'bg-cyan-200': '#a5f3fc', 'bg-cyan-300': '#67e8f9', 'bg-cyan-400': '#22d3ee', 'bg-cyan-500': '#06b6d4', 'bg-cyan-600': '#0891b2', 'bg-cyan-700': '#0e7490', 'bg-cyan-800': '#155e75', 'bg-cyan-900': '#164e63', 'bg-cyan-950': '#083344',
      'bg-sky-50': '#f0f9ff', 'bg-sky-100': '#e0f2fe', 'bg-sky-200': '#bae6fd', 'bg-sky-300': '#7dd3fc', 'bg-sky-400': '#38bdf8', 'bg-sky-500': '#0ea5e9', 'bg-sky-600': '#0284c7', 'bg-sky-700': '#0369a1', 'bg-sky-800': '#075985', 'bg-sky-900': '#0c4a6e', 'bg-sky-950': '#082f49',
      'bg-blue-50': '#eff6ff', 'bg-blue-100': '#dbeafe', 'bg-blue-200': '#bfdbfe', 'bg-blue-300': '#93c5fd', 'bg-blue-400': '#60a5fa', 'bg-blue-500': '#3b82f6', 'bg-blue-600': '#2563eb', 'bg-blue-700': '#1d4ed8', 'bg-blue-800': '#1e40af', 'bg-blue-900': '#1e3a8a', 'bg-blue-950': '#172554',
      'bg-indigo-50': '#f5f3ff', 'bg-indigo-100': '#ede9fe', 'bg-indigo-200': '#ddd6fe', 'bg-indigo-300': '#c4b5fd', 'bg-indigo-400': '#a78bfa', 'bg-indigo-500': '#6366f1', 'bg-indigo-600': '#4f46e5', 'bg-indigo-700': '#4338ca', 'bg-indigo-800': '#3730a3', 'bg-indigo-900': '#312e81', 'bg-indigo-950': '#1e1b4b',
      'bg-violet-50': '#f5f3ff', 'bg-violet-100': '#ede9fe', 'bg-violet-200': '#ddd6fe', 'bg-violet-300': '#c4b5fd', 'bg-violet-400': '#a78bfa', 'bg-violet-500': '#8b5cf6', 'bg-violet-600': '#7c3aed', 'bg-violet-700': '#6d28d9', 'bg-violet-800': '#5b21b6', 'bg-violet-900': '#4c1d95', 'bg-violet-950': '#2e1065',
      'bg-purple-50': '#faf5ff', 'bg-purple-100': '#f3e8ff', 'bg-purple-200': '#e9d5ff', 'bg-purple-300': '#d8b4fe', 'bg-purple-400': '#c084fc', 'bg-purple-500': '#a855f7', 'bg-purple-600': '#9333ea', 'bg-purple-700': '#7e22ce', 'bg-purple-800': '#6b21a8', 'bg-purple-900': '#581c87', 'bg-purple-950': '#3b0764',
      'bg-fuchsia-50': '#fdf4ff', 'bg-fuchsia-100': '#fae8ff', 'bg-fuchsia-200': '#f5d0fe', 'bg-fuchsia-300': '#f0abfc', 'bg-fuchsia-400': '#e879f9', 'bg-fuchsia-500': '#d946ef', 'bg-fuchsia-600': '#c026d3', 'bg-fuchsia-700': '#a21caf', 'bg-fuchsia-800': '#86198f', 'bg-fuchsia-900': '#701a75', 'bg-fuchsia-950': '#4a044e',
      'bg-pink-50': '#fdf2f8', 'bg-pink-100': '#fce7f3', 'bg-pink-200': '#fbcfe8', 'bg-pink-300': '#f9a8d4', 'bg-pink-400': '#f472b6', 'bg-pink-500': '#ec4899', 'bg-pink-600': '#db2777', 'bg-pink-700': '#be185d', 'bg-pink-800': '#9d174d', 'bg-pink-900': '#831843', 'bg-pink-950': '#500724',
      'bg-rose-50': '#fff1f2', 'bg-rose-100': '#ffe4e6', 'bg-rose-200': '#fecdd3', 'bg-rose-300': '#fda4af', 'bg-rose-400': '#fb7185', 'bg-rose-500': '#f43f5e', 'bg-rose-600': '#e11d48', 'bg-rose-700': '#be123c', 'bg-rose-800': '#9f1239', 'bg-rose-900': '#881337', 'bg-rose-950': '#4c0519',
      'bg-slate-50': '#f8fafc', 'bg-slate-100': '#f1f5f9', 'bg-slate-200': '#e2e8f0', 'bg-slate-300': '#cbd5e1', 'bg-slate-400': '#94a3b8', 'bg-slate-500': '#64748b', 'bg-slate-600': '#475569', 'bg-slate-700': '#334155', 'bg-slate-800': '#1e293b', 'bg-slate-900': '#0f172a', 'bg-slate-950': '#020617',
      'bg-gray-50': '#f9fafb', 'bg-gray-100': '#f3f4f6', 'bg-gray-200': '#e5e7eb', 'bg-gray-300': '#d1d5db', 'bg-gray-400': '#9ca3af', 'bg-gray-500': '#6b7280', 'bg-gray-600': '#4b5563', 'bg-gray-700': '#374151', 'bg-gray-800': '#1f2937', 'bg-gray-900': '#111827', 'bg-gray-950': '#030712',
      'bg-zinc-50': '#fafafa', 'bg-zinc-100': '#f4f4f5', 'bg-zinc-200': '#e4e4e7', 'bg-zinc-300': '#d4d4d8', 'bg-zinc-400': '#a1a1aa', 'bg-zinc-500': '#71717a', 'bg-zinc-600': '#52525b', 'bg-zinc-700': '#3f3f46', 'bg-zinc-800': '#27272a', 'bg-zinc-900': '#18181b', 'bg-zinc-950': '#09090b',
      'bg-neutral-50': '#fafafa', 'bg-neutral-100': '#f5f5f5', 'bg-neutral-200': '#e5e5e5', 'bg-neutral-300': '#d4d4d4', 'bg-neutral-400': '#a3a3a3', 'bg-neutral-500': '#737373', 'bg-neutral-600': '#525252', 'bg-neutral-700': '#404040', 'bg-neutral-800': '#262626', 'bg-neutral-900': '#171717', 'bg-neutral-950': '#0a0a0a',
      'bg-stone-50': '#fafaf9', 'bg-stone-100': '#f5f5f4', 'bg-stone-200': '#e7e5e4', 'bg-stone-300': '#d6d3d1', 'bg-stone-400': '#a8a29e', 'bg-stone-500': '#78716c', 'bg-stone-600': '#57534e', 'bg-stone-700': '#44403c', 'bg-stone-800': '#292524', 'bg-stone-900': '#1c1917', 'bg-stone-950': '#0c0a09',
      'bg-orange-50': '#fff7ed', 'bg-orange-100': '#ffedd5', 'bg-orange-200': '#fed7aa', 'bg-orange-300': '#fdba74', 'bg-orange-400': '#fb923c', 'bg-orange-500': '#f97316', 'bg-orange-600': '#ea580c', 'bg-orange-700': '#c2410c', 'bg-orange-800': '#9a3412', 'bg-orange-900': '#7c2d12', 'bg-orange-950': '#431407',
      'bg-amber-50': '#fffbeb', 'bg-amber-100': '#fef3c7', 'bg-amber-200': '#fde68a', 'bg-amber-300': '#fcd34d', 'bg-amber-400': '#fbbf24', 'bg-amber-500': '#f59e0b', 'bg-amber-600': '#d97706', 'bg-amber-700': '#b45309', 'bg-amber-800': '#92400e', 'bg-amber-900': '#78350f', 'bg-amber-950': '#451a03',
      'bg-red-50': '#fef2f2', 'bg-red-100': '#fee2e2', 'bg-red-200': '#fecaca', 'bg-red-300': '#fca5a5', 'bg-red-400': '#f87171', 'bg-red-500': '#ef4444', 'bg-red-600': '#dc2626', 'bg-red-700': '#b91c1c', 'bg-red-800': '#991b1b', 'bg-red-900': '#7f1d1d', 'bg-red-950': '#450a0a',
      'bg-black': '#000000', 'bg-white': '#ffffff'
    };

    let colorKey = twClass;
    if (twClass.startsWith('text-')) colorKey = twClass.replace('text-', 'bg-');
    if (twClass.startsWith('border-')) colorKey = twClass.replace('border-', 'bg-');

    let mapped = colorMap[colorKey] || twClass;
    
    // Resolve CSS variables
    if (mapped.startsWith('var(')) {
      const varName = mapped.substring(4, mapped.length - 1);
      mapped = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    } else if (mapped.startsWith('--')) {
      mapped = getComputedStyle(document.documentElement).getPropertyValue(mapped).trim();
    }

    // Convert to hex if it's rgb
    if (mapped.startsWith('rgb')) {
      const parts = mapped.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const r = parseInt(parts[0]);
        const g = parseInt(parts[1]);
        const b = parseInt(parts[2]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }

    return mapped.startsWith('#') ? mapped : '#ffffff';
  };

  const openThemeDesigner = (frag: Fragrance, baseTheme: UserTheme | ColorTheme) => {
    const isCustom = 'isCustom' in baseTheme && baseTheme.isCustom;
    
    setCustomThemeEditor({
      fragranceId: frag.id,
      themeId: isCustom ? (baseTheme as UserTheme).id : undefined,
      name: baseTheme.name || '',
      color1: isCustom ? (baseTheme as UserTheme).color1 : tailwindToHex(baseTheme.top),
      color2: isCustom ? (baseTheme as UserTheme).color2 : tailwindToHex(baseTheme.bottom),
      textColor: isCustom ? (baseTheme as UserTheme).text : tailwindToHex(baseTheme.text),
      accentColor: isCustom ? (baseTheme as UserTheme).accent : tailwindToHex(baseTheme.accent),
      tagText: isCustom ? (baseTheme as UserTheme).tagText : tailwindToHex(baseTheme.tagText),
      tagBg: isCustom ? (baseTheme as UserTheme).tagBg : tailwindToHex(baseTheme.tagBg),
      nameText: isCustom ? (baseTheme as UserTheme).nameText : tailwindToHex(baseTheme.text),
      houseText: isCustom ? (baseTheme as UserTheme).houseText : tailwindToHex(baseTheme.text),
      inspiredText: isCustom ? (baseTheme as UserTheme).inspiredText : tailwindToHex(baseTheme.text),
      isGradient: isCustom ? (baseTheme as UserTheme).isGradient : false,
      gradientDirection: isCustom ? (baseTheme as UserTheme).gradientDirection : 'to right'
    });
    setOpenMenuId(null);
    setShowColorPicker(null);
  };

  const saveUserTheme = (theme: UserTheme) => {
    if (!setUserThemes) return;
    setUserThemes(prev => {
      const exists = prev.find(t => t.id === theme.id);
      if (exists) {
        return prev.map(t => t.id === theme.id ? theme : t);
      }
      return [...prev, theme];
    });
  };

  const deleteUserTheme = (themeId: string) => {
    confirm('Delete Theme', 'Are you sure you want to delete this custom theme?', () => {
      if (!setUserThemes) return;
      setUserThemes(prev => prev.filter(t => t.id !== themeId));
      // Also clear from fragrances using it
      setFragrances(fragrances.map(f => f.customTheme?.id === themeId ? { ...f, colorTheme: 'default', customTheme: undefined } : f));
    });
  };

  // Extract suggestions
  const noteSuggestions = useMemo(() => {
    const notes = new Set<string>();
    fragrances.forEach(f => {
      migrateToArray(f.topNotes).forEach(n => notes.add(n));
      migrateToArray(f.heartNotes).forEach(n => notes.add(n));
      migrateToArray(f.baseNotes).forEach(n => notes.add(n));
    });
    return Array.from(notes).sort();
  }, [fragrances]);

  const tagSuggestions = useMemo(() => {
    const tags = new Set<string>();
    fragrances.forEach(f => {
      migrateToArray(f.tags).forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [fragrances]);

  const handleSaveAndContinue = () => {
    if (!currentFragrance.name) return;

    const newFragrance = {
      ...currentFragrance,
      id: currentFragrance.id || crypto.randomUUID(),
      topNotes: migrateToArray(currentFragrance.topNotes),
      heartNotes: migrateToArray(currentFragrance.heartNotes),
      baseNotes: migrateToArray(currentFragrance.baseNotes),
      tags: migrateToArray(currentFragrance.tags),
    } as Fragrance;

    if (currentFragrance.id) {
      setFragrances(fragrances.map((f) => f.id === newFragrance.id ? newFragrance : f));
    } else {
      setFragrances([...fragrances, newFragrance]);
    }
    
    setCurrentFragrance({
      ...newFragrance,
      id: crypto.randomUUID(),
      name: '', // Reset name for the new entry
    });
  };

  const handleSave = () => {
    if (!currentFragrance.name) return;

    const newFragrance = {
      ...currentFragrance,
      id: currentFragrance.id || crypto.randomUUID(),
      topNotes: migrateToArray(currentFragrance.topNotes),
      heartNotes: migrateToArray(currentFragrance.heartNotes),
      baseNotes: migrateToArray(currentFragrance.baseNotes),
      tags: migrateToArray(currentFragrance.tags),
    } as Fragrance;

    if (currentFragrance.id) {
      setFragrances(fragrances.map((f) => f.id === newFragrance.id ? newFragrance : f));
    } else {
      setFragrances([...fragrances, newFragrance]);
    }
    
    setSelectedFragrance(newFragrance);
    setViewState('detail');
  };

  const handleEdit = (fragrance: Fragrance) => {
    setCurrentFragrance({
      ...fragrance,
      topNotes: migrateToArray(fragrance.topNotes),
      heartNotes: migrateToArray(fragrance.heartNotes),
      baseNotes: migrateToArray(fragrance.baseNotes),
      tags: migrateToArray(fragrance.tags),
    });
    setViewState('edit');
  };

  const handleDelete = (id: string) => {
    confirm('Delete Fragrance', 'Are you sure you want to delete this fragrance?', () => {
      setFragrances(fragrances.filter((f) => f.id !== id));
      setViewState('list');
      setSelectedFragrance(null);
    });
  };

  const filteredFragrances = useMemo(() => {
    if (!searchQuery) return fragrances;
    const query = searchQuery.toLowerCase();
    return fragrances.filter(f => {
      if (searchType === 'name') {
        return f.name.toLowerCase().includes(query) || (f.house || '').toLowerCase().includes(query);
      }
      if (searchType === 'tag') {
        return migrateToArray(f.tags).some(t => t.toLowerCase().includes(query));
      }
      if (searchType === 'notes') {
        const allNotes = [
          ...migrateToArray(f.topNotes),
          ...migrateToArray(f.heartNotes),
          ...migrateToArray(f.baseNotes)
        ];
        return allNotes.some(n => n.toLowerCase().includes(query));
      }
      return true;
    });
  }, [fragrances, searchQuery, searchType]);

  if (viewState === 'edit') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setViewState(selectedFragrance ? 'detail' : 'list')}
            className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-app-text">
            {currentFragrance.id ? 'Edit Fragrance' : 'New Fragrance'}
          </h2>
        </div>

        <div className="bg-app-card rounded-lg shadow border border-app-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Name *</label>
              <input
                type="text"
                value={currentFragrance.name || ''}
                onChange={(e) => setCurrentFragrance({ ...currentFragrance, name: e.target.value })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                placeholder="e.g., Midnight Rose"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">House</label>
              <input
                type="text"
                value={currentFragrance.house || ''}
                onChange={(e) => setCurrentFragrance({ ...currentFragrance, house: e.target.value })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                placeholder="e.g., Tom Ford"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Original Scent</label>
              <input
                type="text"
                value={currentFragrance.originalScent || ''}
                onChange={(e) => setCurrentFragrance({ ...currentFragrance, originalScent: e.target.value })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                placeholder="e.g., Oud Wood"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Smell Profile</label>
              <input
                type="text"
                value={currentFragrance.smellProfile || ''}
                onChange={(e) => setCurrentFragrance({ ...currentFragrance, smellProfile: e.target.value })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                placeholder="e.g., Floral, Woody"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Maceration Period (Weeks)</label>
              <input
                type="number"
                min="0"
                value={currentFragrance.macerationPeriodWeeks || ''}
                onChange={(e) => setCurrentFragrance({ ...currentFragrance, macerationPeriodWeeks: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                placeholder="e.g., 4"
              />
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <h4 className="font-medium text-app-text border-b border-app-border pb-2">Notes & Tags</h4>
              
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Top Notes</label>
                <TagInput 
                  tags={migrateToArray(currentFragrance.topNotes)}
                  setTags={(tags) => setCurrentFragrance({ ...currentFragrance, topNotes: tags as any })}
                  suggestions={noteSuggestions}
                  placeholder="Type a note and press Enter..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Heart Notes</label>
                <TagInput 
                  tags={migrateToArray(currentFragrance.heartNotes)}
                  setTags={(tags) => setCurrentFragrance({ ...currentFragrance, heartNotes: tags as any })}
                  suggestions={noteSuggestions}
                  placeholder="Type a note and press Enter..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Base Notes</label>
                <TagInput 
                  tags={migrateToArray(currentFragrance.baseNotes)}
                  setTags={(tags) => setCurrentFragrance({ ...currentFragrance, baseNotes: tags as any })}
                  suggestions={noteSuggestions}
                  placeholder="Type a note and press Enter..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text mb-1">Tags</label>
                <TagInput 
                  tags={migrateToArray(currentFragrance.tags)}
                  setTags={(tags) => setCurrentFragrance({ ...currentFragrance, tags: tags as any })}
                  suggestions={tagSuggestions}
                  placeholder="Type a tag and press Enter..."
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-app-text mb-1">Description</label>
              <textarea
                value={currentFragrance.description || ''}
                onChange={(e) => setCurrentFragrance({ ...currentFragrance, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                placeholder="Detailed description of the fragrance..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-app-border">
            <button
              onClick={() => setViewState(selectedFragrance ? 'detail' : 'list')}
              className="px-4 py-2 text-app-text bg-app-bg rounded-md hover:bg-app-card border border-app-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndContinue}
              disabled={!currentFragrance.name}
              className="px-4 py-2 bg-app-accent/10 text-app-accent rounded-md hover:bg-app-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
            <button
              onClick={handleSave}
              disabled={!currentFragrance.name}
              className="px-4 py-2 bg-app-accent text-white rounded-md hover:bg-app-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Save Fragrance
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'detail' && selectedFragrance) {
    const topNotes = migrateToArray(selectedFragrance.topNotes);
    const heartNotes = migrateToArray(selectedFragrance.heartNotes);
    const baseNotes = migrateToArray(selectedFragrance.baseNotes);
    const tags = migrateToArray(selectedFragrance.tags);
    
    const theme = selectedFragrance.customTheme || colorThemes.find(t => t.id === selectedFragrance.colorTheme) || colorThemes[0];
    const isCustom = !!selectedFragrance.customTheme;

    const topStyle = isCustom ? { 
      background: theme.isGradient ? `linear-gradient(${theme.gradientDirection || 'to right'}, ${theme.color1}, ${theme.color2})` : theme.top,
      color: theme.text,
      borderColor: theme.border
    } : {};
    const bottomStyle = isCustom ? { 
      backgroundColor: theme.bottom,
      borderColor: theme.border
    } : {};
    const textStyle = isCustom ? { color: theme.text } : {};
    const subTextStyle = isCustom ? { color: theme.subText } : {};
    const borderStyle = isCustom ? { borderColor: theme.border } : {};
    const tagStyle = isCustom ? { backgroundColor: theme.tagBg, color: theme.tagText, borderColor: theme.border } : {};

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 text-app-muted hover:text-app-text hover:bg-app-bg rounded-full transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-app-text">{selectedFragrance.name}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(selectedFragrance)}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border text-app-text rounded-md hover:bg-app-bg transition-colors"
            >
              <Edit2 size={18} />
              Edit
            </button>
            <button
              onClick={() => handleDelete(selectedFragrance.id)}
              className="flex items-center gap-2 px-4 py-2 bg-app-card border border-red-500/20 text-red-600 rounded-md hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        <div className={`rounded-xl shadow-sm border ${!isCustom ? theme.border : ''} overflow-hidden`} style={borderStyle}>
          <div className={`p-8 border-b ${!isCustom ? `${theme.border} ${theme.top}` : ''}`} style={topStyle}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className={`text-sm font-medium ${!isCustom ? theme.subText : ''} uppercase tracking-wider`} style={subTextStyle}>House</p>
                <p className={`mt-1 text-lg font-semibold ${!isCustom ? theme.text : ''}`} style={isCustom ? { color: theme.houseText || theme.text } : textStyle}>{selectedFragrance.house || '—'}</p>
              </div>
              <div>
                <p className={`text-sm font-medium ${!isCustom ? theme.subText : ''} uppercase tracking-wider`} style={subTextStyle}>Original Scent</p>
                <p className={`mt-1 text-lg font-semibold ${!isCustom ? theme.text : ''}`} style={isCustom ? { color: theme.inspiredText || theme.text } : textStyle}>{selectedFragrance.originalScent || '—'}</p>
              </div>
              <div>
                <p className={`text-sm font-medium ${!isCustom ? theme.subText : ''} uppercase tracking-wider`} style={subTextStyle}>Smell Profile</p>
                <p className={`mt-1 text-lg font-semibold ${!isCustom ? theme.text : ''}`} style={textStyle}>{selectedFragrance.smellProfile || '—'}</p>
              </div>
              <div>
                <p className={`text-sm font-medium ${!isCustom ? theme.subText : ''} uppercase tracking-wider`} style={subTextStyle}>Maceration Period</p>
                <p className={`mt-1 text-lg font-semibold ${!isCustom ? theme.text : ''}`} style={textStyle}>{selectedFragrance.macerationPeriodWeeks ? `${selectedFragrance.macerationPeriodWeeks} Weeks` : '—'}</p>
              </div>
            </div>
          </div>

          <div className={`p-8 space-y-8 ${!isCustom ? theme.bottom : ''}`} style={bottomStyle}>
            {(topNotes.length > 0 || heartNotes.length > 0 || baseNotes.length > 0) && (
              <div>
                <h3 className={`text-lg font-bold ${!isCustom ? theme.text : ''} mb-4 flex items-center gap-2`} style={textStyle}>
                  <span className={`w-8 h-px ${!isCustom ? theme.border : ''} border-t`} style={borderStyle}></span>
                  Olfactory Pyramid
                  <span className={`flex-1 h-px ${!isCustom ? theme.border : ''} border-t`} style={borderStyle}></span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${!isCustom ? `${theme.tagBg} border ${theme.border}` : ''} rounded-lg p-4`} style={tagStyle}>
                    <h4 className={`font-semibold ${!isCustom ? theme.text : ''} mb-3 text-center`} style={textStyle}>Top Notes</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {topNotes.length > 0 ? topNotes.map(n => (
                        <span key={n} className={`px-3 py-1 ${!isCustom ? `${theme.top} border ${theme.border} ${theme.text}` : ''} rounded-full text-sm shadow-sm`} style={{ ...tagStyle, backgroundColor: isCustom ? theme.top : undefined }}>{n}</span>
                      )) : <span className={`${!isCustom ? theme.subText : ''} italic text-sm`} style={subTextStyle}>None</span>}
                    </div>
                  </div>
                  <div className={`${!isCustom ? `${theme.tagBg} border ${theme.border}` : ''} rounded-lg p-4`} style={tagStyle}>
                    <h4 className={`font-semibold ${!isCustom ? theme.text : ''} mb-3 text-center`} style={textStyle}>Heart Notes</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {heartNotes.length > 0 ? heartNotes.map(n => (
                        <span key={n} className={`px-3 py-1 ${!isCustom ? `${theme.top} border ${theme.border} ${theme.text}` : ''} rounded-full text-sm shadow-sm`} style={{ ...tagStyle, backgroundColor: isCustom ? theme.top : undefined }}>{n}</span>
                      )) : <span className={`${!isCustom ? theme.subText : ''} italic text-sm`} style={subTextStyle}>None</span>}
                    </div>
                  </div>
                  <div className={`${!isCustom ? `${theme.tagBg} border ${theme.border}` : ''} rounded-lg p-4`} style={tagStyle}>
                    <h4 className={`font-semibold ${!isCustom ? theme.text : ''} mb-3 text-center`} style={textStyle}>Base Notes</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {baseNotes.length > 0 ? baseNotes.map(n => (
                        <span key={n} className={`px-3 py-1 ${!isCustom ? `${theme.top} border ${theme.border} ${theme.text}` : ''} rounded-full text-sm shadow-sm`} style={{ ...tagStyle, backgroundColor: isCustom ? theme.top : undefined }}>{n}</span>
                      )) : <span className={`${!isCustom ? theme.subText : ''} italic text-sm`} style={subTextStyle}>None</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold ${!isCustom ? theme.subText : ''} uppercase tracking-wider mb-3`} style={subTextStyle}>Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => (
                    <span key={t} className={`px-3 py-1 ${!isCustom ? `${theme.tagBg} ${theme.tagText}` : ''} rounded-md text-sm font-medium`} style={tagStyle}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedFragrance.description && (
              <div>
                <h4 className={`text-sm font-semibold ${!isCustom ? theme.subText : ''} uppercase tracking-wider mb-2`} style={subTextStyle}>Description</h4>
                <p className={`${!isCustom ? theme.text : ''} leading-relaxed ${!isCustom ? `${theme.tagBg} border ${theme.border}` : ''} p-4 rounded-lg`} style={{ ...textStyle, ...tagStyle }}>
                  {selectedFragrance.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-app-text">Fragrance Database (v2)</h2>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowTutorial(true)}
            className="p-2 text-app-muted hover:text-app-accent hover:bg-app-accent/5 rounded-full transition-colors"
            title="How to use"
          >
            <HelpCircle size={22} />
          </button>
          {isSelectionMode && selectedIds.length > 0 && (
            <button
              onClick={deleteSelectedFragrances}
              className="flex items-center gap-2 bg-red-500/10 text-red-600 px-4 py-2 rounded-md hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={20} />
              <span className="hidden sm:inline">Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          {isSelectionMode && (
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedIds([]);
              }}
              className="flex items-center gap-2 bg-app-bg text-app-text px-4 py-2 rounded-md hover:bg-app-card border border-app-border transition-colors"
            >
              Cancel Selection
            </button>
          )}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" size={18} />
            <input
              type="text"
              placeholder={`Search by ${searchType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
            />
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-3 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
          >
            <option value="name">Name / House</option>
            <option value="tag">Tag</option>
            <option value="notes">Notes</option>
          </select>
          <button
            onClick={() => {
              setCurrentFragrance({ topNotes: [], heartNotes: [], baseNotes: [], tags: [] } as any);
              setViewState('edit');
            }}
            className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-md hover:bg-app-accent-hover transition-colors whitespace-nowrap shadow-sm"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Fragrance</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFragrances.length === 0 ? (
          <div className="col-span-full py-12 text-center text-app-muted italic bg-app-card rounded-lg border border-app-border border-dashed">
            {searchQuery ? 'No fragrances found matching your search.' : 'No fragrances in the database.'}
          </div>
        ) : (
          filteredFragrances.map((fragrance, index) => {
            const tags = migrateToArray(fragrance.tags);
            const theme = fragrance.customTheme || colorThemes.find(t => t.id === fragrance.colorTheme) || colorThemes[0];
            const originalIndex = fragrances.findIndex(f => f.id === fragrance.id);
            
            const isCustom = !!fragrance.customTheme;
            const topStyle = isCustom ? { 
              background: theme.isGradient ? `linear-gradient(${theme.gradientDirection || 'to right'}, ${theme.color1}, ${theme.color2})` : theme.top,
              color: theme.text,
              borderColor: theme.border
            } : {};
            const bottomStyle = isCustom ? { 
              backgroundColor: theme.bottom,
              borderColor: theme.border
            } : {};
            const textStyle = isCustom ? { color: theme.text } : {};
            const subTextStyle = isCustom ? { color: theme.subText } : {};
            const accentStyle = isCustom ? { background: theme.accent } : {};
            const borderStyle = isCustom ? { borderColor: theme.border } : {};
            const tagStyle = isCustom ? { backgroundColor: theme.tagBg, color: theme.tagText, borderColor: theme.border } : {};

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                key={fragrance.id}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelection(fragrance.id);
                  } else {
                    setSelectedFragrance(fragrance);
                    setViewState('detail');
                  }
                }}
                className={`relative group bg-app-card rounded-[2rem] shadow-sm hover:shadow-2xl transition-shadow duration-300 border border-app-border cursor-pointer flex flex-col h-full ${!isCustom ? theme.border : ''}`}
                style={isCustom ? { borderColor: theme.border } : {}}
              >
                {/* Selection Overlay */}
                {isSelectionMode && (
                  <div 
                    className={`absolute inset-0 z-20 flex items-center justify-center transition-colors ${selectedIds.includes(fragrance.id) ? 'bg-app-accent/20' : 'bg-black/5 hover:bg-black/10'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(fragrance.id);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${selectedIds.includes(fragrance.id) ? 'bg-app-accent border-app-accent text-white scale-110' : 'bg-white/50 border-white text-transparent'}`}>
                      <CheckSquare size={20} />
                    </div>
                  </div>
                )}

                {/* Actions Menu */}
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowColorPicker(fragrance.id === showColorPicker ? null : fragrance.id)}
                    className={`p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all border border-white/10 md:hidden ${isCustom ? '' : 'text-app-muted hover:text-app-text'}`}
                    style={isCustom ? { color: theme.text } : {}}
                  >
                    <Palette size={18} />
                  </button>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === fragrance.id ? null : fragrance.id)}
                    className={`p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full transition-all border border-white/10 md:opacity-0 md:group-hover:opacity-100 ${isCustom ? '' : 'text-app-muted hover:text-app-text'}`}
                    style={isCustom ? { color: theme.text } : {}}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {(openMenuId === fragrance.id || showColorPicker === fragrance.id) && (
                    <div className="absolute right-0 mt-2 w-56 bg-app-card border border-app-border rounded-xl shadow-2xl z-40 overflow-hidden py-1">
                      {showColorPicker === fragrance.id ? (
                        <div className="p-3 space-y-3">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider">Themes</span>
                            <button onClick={() => setShowColorPicker(null)} className="text-app-muted hover:text-app-text">
                              <ChevronLeft size={14} />
                            </button>
                          </div>
                          
                          <div className="space-y-3 max-h-64 overflow-y-auto p-1">
                            {/* Custom Theme Option */}
                            <button
                              onClick={() => openThemeDesigner(fragrance, theme)}
                              className="w-full flex items-center gap-2 p-2 rounded-md bg-app-bg hover:bg-app-accent/10 text-app-text text-xs border border-app-border transition-colors"
                            >
                              <Palette size={14} className="text-app-accent" />
                              <span className="font-medium">Theme Designer</span>
                            </button>

                            {userThemes.length > 0 && (
                              <div className="border-t border-app-border pt-3">
                                <p className="text-[10px] font-black text-app-muted uppercase mb-2 px-1">My Themes</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {userThemes.map(t => (
                                    <div key={t.id} className="relative group/theme">
                                      <button
                                        onClick={() => {
                                          changeColorTheme(fragrance.id, 'custom', t);
                                          setOpenMenuId(null);
                                          setShowColorPicker(null);
                                        }}
                                        title={t.name}
                                        className={`w-8 h-8 rounded-full border-2 ${t.id === fragrance.customTheme?.id ? 'border-app-accent ring-2 ring-app-accent/30' : 'border-app-border hover:border-app-accent/50'} relative overflow-hidden transition-all`}
                                        style={{ background: t.isGradient ? `linear-gradient(${t.gradientDirection || 'to right'}, ${t.color1}, ${t.color2})` : t.top }}
                                      >
                                        {!t.isGradient && <div className="absolute bottom-0 w-full h-1/2" style={{ backgroundColor: t.bottom }}></div>}
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openThemeDesigner(fragrance, t);
                                        }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-app-accent text-white rounded-full flex items-center justify-center opacity-0 group-hover/theme:opacity-100 transition-opacity shadow-sm"
                                      >
                                        <Pencil size={8} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Factory Themes */}
                            <div className="border-t border-app-border pt-3">
                              <p className="text-[10px] font-black text-app-muted uppercase mb-2 px-1">Factory Themes</p>
                              <div className="grid grid-cols-5 gap-2">
                                {colorThemes.map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => {
                                      changeColorTheme(fragrance.id, t.id, undefined);
                                      setOpenMenuId(null);
                                      setShowColorPicker(null);
                                    }}
                                    title={t.name}
                                    className={`w-8 h-8 rounded-full border-2 ${t.id === fragrance.colorTheme && !fragrance.customTheme ? 'border-app-accent ring-2 ring-app-accent/30' : 'border-app-border hover:border-app-accent/50'} ${t.top} relative overflow-hidden transition-all`}
                                  >
                                    <div className={`absolute bottom-0 w-full h-1/2 ${t.bottom}`}></div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateFragrance(fragrance);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                          >
                            <Copy size={16} /> Duplicate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSelectionMode(true);
                              setSelectedIds([fragrance.id]);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                          >
                            <CheckSquare size={16} /> Select
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowColorPicker(fragrance.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-app-text hover:bg-app-bg flex items-center gap-2"
                          >
                            <Palette size={16} /> Change Color
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(fragrance.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className={`flex flex-col h-full`}>
                  {/* Top Section: Name & House */}
                  <div 
                    className={`p-8 flex flex-col relative overflow-hidden rounded-t-[2rem] ${!isCustom ? theme.top : ''}`} 
                    style={topStyle}
                  >
                    {/* Decorative Element */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-1">
                        <h3 
                          className={`text-2xl font-bold tracking-tight leading-tight ${!isCustom ? theme.text : ''} transition-all duration-300 group-hover:translate-x-1`} 
                          style={isCustom ? { color: theme.nameText || theme.text } : textStyle}
                        >
                          {fragrance.name}
                        </h3>
                      </div>
                      
                      {fragrance.house && (
                        <p 
                          className={`text-[10px] font-black uppercase tracking-[0.25em] ${!isCustom ? theme.subText : ''} opacity-80`} 
                          style={isCustom ? { color: theme.houseText || theme.subText } : subTextStyle}
                        >
                          {fragrance.house}
                        </p>
                      )}
                    </div>

                    {fragrance.originalScent && (
                      <div className="mt-6 relative z-10">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium bg-white/10 backdrop-blur-md border border-white/10 ${!isCustom ? theme.text : ''}`} style={isCustom ? { color: theme.inspiredText || theme.text } : textStyle}>
                          <Sparkles size={10} className="opacity-70" />
                          <span className="opacity-70">Inspired by</span>
                          <span className="font-bold">{fragrance.originalScent}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Section: Profile & Tags */}
                  <div 
                    className={`p-8 flex flex-col flex-1 relative rounded-b-[2rem] ${!isCustom ? theme.bottom : ''} border-t ${!isCustom ? theme.border : ''}`} 
                    style={{ ...bottomStyle, borderTopWidth: '1px' }}
                  >
                    {fragrance.smellProfile && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-1 h-4 rounded-full ${!isCustom ? theme.accent : ''}`} style={isCustom ? { backgroundColor: theme.accent } : {}} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider opacity-60 ${!isCustom ? theme.text : ''}`} style={textStyle}>Scent Profile</span>
                        </div>
                        <span 
                          className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm border transition-all hover:scale-105 ${!isCustom ? `${theme.tagBg} ${theme.tagText} border ${theme.border}` : ''}`} 
                          style={tagStyle}
                        >
                          {fragrance.smellProfile}
                        </span>
                      </div>
                    )}
                    
                    <div className={`mt-auto pt-6 border-t flex items-center justify-between ${!isCustom ? theme.border : ''}`} style={borderStyle}>
                      <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 3).map(tag => (
                          <span 
                            key={tag} 
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${!isCustom ? `${theme.tagBg} ${theme.tagText} border ${theme.border}` : ''}`} 
                            style={tagStyle}
                          >
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span 
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${!isCustom ? `${theme.tagBg} ${theme.tagText} border ${theme.border}` : ''}`} 
                            style={tagStyle}
                          >
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>

                      <div className={`p-2 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 ${!isCustom ? theme.text : ''}`} style={textStyle}>
                        <Eye size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              );
            })
        )}
      </div>

      {/* Custom Theme Editor Modal */}
      {customThemeEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-app-border">
            <div className="p-6 border-b border-app-border flex justify-between items-center bg-app-accent text-white">
              <div className="flex items-center gap-3">
                <Palette size={24} />
                <h2 className="text-xl font-bold">Custom Theme Designer</h2>
              </div>
              <button 
                onClick={() => setCustomThemeEditor(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Controls */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-app-text mb-2">Theme Name</label>
                  <input 
                    type="text"
                    value={customThemeEditor.name || ''}
                    onChange={(e) => setCustomThemeEditor({ ...customThemeEditor, name: e.target.value })}
                    className="w-full px-4 py-2 bg-app-bg border border-app-border rounded-md text-app-text focus:ring-app-accent focus:border-app-accent"
                    placeholder="e.g. Midnight Rose"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RGBInput 
                    label={customThemeEditor.isGradient ? "Color 1 (Left)" : "Top Background"} 
                    value={customThemeEditor.color1} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, color1: val })} 
                  />
                  <RGBInput 
                    label={customThemeEditor.isGradient ? "Color 2 (Right)" : "Bottom Background"} 
                    value={customThemeEditor.color2} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, color2: val })} 
                  />
                </div>

                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={customThemeEditor.isGradient}
                      onChange={(e) => setCustomThemeEditor({ ...customThemeEditor, isGradient: e.target.checked })}
                      className="rounded border-app-border text-app-accent focus:ring-app-accent"
                    />
                    <span className="text-sm font-medium text-app-text">Enable Gradient</span>
                  </label>
                </div>

                {customThemeEditor.isGradient && (
                  <div className="space-y-3 p-3 bg-app-bg rounded-lg border border-app-border">
                    <label className="block text-xs font-bold text-app-muted uppercase tracking-wider">Gradient Direction</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'to right', icon: ArrowRight, label: 'Horizontal' },
                        { id: 'to bottom', icon: ArrowDown, label: 'Vertical' },
                        { id: 'to bottom right', icon: ArrowDownRight, label: 'Diagonal' },
                        { id: 'to top right', icon: ArrowUpRight, label: 'Sideway' },
                      ].map((dir) => (
                        <button
                          key={dir.id}
                          onClick={() => setCustomThemeEditor({ ...customThemeEditor, gradientDirection: dir.id as any })}
                          className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all ${
                            customThemeEditor.gradientDirection === dir.id 
                              ? 'bg-app-accent text-white border-app-accent shadow-sm' 
                              : 'bg-app-card text-app-muted border-app-border hover:border-app-accent/50'
                          }`}
                        >
                          <dir.icon size={16} />
                          <span className="text-[10px] font-medium">{dir.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <RGBInput 
                    label="Text Color" 
                    value={customThemeEditor.textColor} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, textColor: val })} 
                  />
                  <RGBInput 
                    label="Accent/Tag Color" 
                    value={customThemeEditor.accentColor} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, accentColor: val })} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RGBInput 
                    label="Name Color" 
                    value={customThemeEditor.nameText} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, nameText: val })} 
                  />
                  <RGBInput 
                    label="House Color" 
                    value={customThemeEditor.houseText} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, houseText: val })} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RGBInput 
                    label="Inspired By Color" 
                    value={customThemeEditor.inspiredText} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, inspiredText: val })} 
                  />
                  <RGBInput 
                    label="Tagging Text Color" 
                    value={customThemeEditor.tagText} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, tagText: val })} 
                  />
                  <RGBInput 
                    label="Tag Background Color" 
                    value={customThemeEditor.tagBg} 
                    onChange={(val) => setCustomThemeEditor({ ...customThemeEditor, tagBg: val })} 
                  />
                </div>

                <div className="pt-6 border-t border-app-border flex gap-3">
                  <button
                    onClick={() => {
                      const newTheme: UserTheme = {
                        id: customThemeEditor.themeId || `user_${Date.now()}`,
                        name: customThemeEditor.name || 'Custom Theme',
                        top: customThemeEditor.color1,
                        bottom: customThemeEditor.color2,
                        text: customThemeEditor.textColor,
                        subText: `${customThemeEditor.textColor}cc`, // 80% opacity
                        accent: customThemeEditor.accentColor,
                        border: `${customThemeEditor.textColor}33`, // 20% opacity
                        tagBg: customThemeEditor.tagBg,
                        tagText: customThemeEditor.tagText,
                        nameText: customThemeEditor.nameText,
                        houseText: customThemeEditor.houseText,
                        inspiredText: customThemeEditor.inspiredText,
                        isCustom: true,
                        isGradient: customThemeEditor.isGradient,
                        gradientDirection: customThemeEditor.gradientDirection,
                        color1: customThemeEditor.color1,
                        color2: customThemeEditor.color2
                      };
                      saveUserTheme(newTheme);
                      changeColorTheme(customThemeEditor.fragranceId, 'custom', newTheme);
                      setCustomThemeEditor(null);
                    }}
                    className="flex-1 bg-app-accent text-white py-2 rounded-md font-bold hover:bg-app-accent-hover transition-colors shadow-sm"
                  >
                    {customThemeEditor.themeId ? 'Update Theme' : 'Save & Apply'}
                  </button>
                  <button
                    onClick={() => {
                      const tempTheme: UserTheme = {
                        id: 'temp',
                        name: 'Preview',
                        top: customThemeEditor.color1,
                        bottom: customThemeEditor.color2,
                        text: customThemeEditor.textColor,
                        subText: `${customThemeEditor.textColor}cc`,
                        accent: customThemeEditor.accentColor,
                        border: `${customThemeEditor.textColor}33`,
                        tagBg: customThemeEditor.tagBg,
                        tagText: customThemeEditor.tagText,
                        nameText: customThemeEditor.nameText,
                        houseText: customThemeEditor.houseText,
                        inspiredText: customThemeEditor.inspiredText,
                        isCustom: true,
                        isGradient: customThemeEditor.isGradient,
                        gradientDirection: customThemeEditor.gradientDirection,
                        color1: customThemeEditor.color1,
                        color2: customThemeEditor.color2
                      };
                      changeColorTheme(customThemeEditor.fragranceId, 'custom', tempTheme);
                    }}
                    className="flex-1 bg-app-bg text-app-text border border-app-border py-2 rounded-md font-bold hover:bg-app-card transition-colors"
                  >
                    Preview Only
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="flex flex-col items-center justify-center bg-app-bg rounded-xl p-8 border border-app-border border-dashed">
                <p className="text-xs font-bold text-app-muted uppercase mb-4 tracking-widest">Real-time Preview</p>
                <div className="w-full max-w-sm">
                  {(() => {
                    const frag = fragrances.find(f => f.id === customThemeEditor.fragranceId);
                    if (!frag) return null;
                    
                    const tempTheme: UserTheme = {
                      id: 'temp',
                      name: customThemeEditor.name || 'Preview',
                      top: customThemeEditor.color1,
                      bottom: customThemeEditor.color2,
                      text: customThemeEditor.textColor,
                      subText: `${customThemeEditor.textColor}cc`,
                      accent: customThemeEditor.accentColor,
                      border: `${customThemeEditor.textColor}33`,
                      tagBg: `${customThemeEditor.accentColor}33`,
                      tagText: customThemeEditor.tagText,
                      nameText: customThemeEditor.nameText,
                      houseText: customThemeEditor.houseText,
                      inspiredText: customThemeEditor.inspiredText,
                      isCustom: true,
                      isGradient: customThemeEditor.isGradient,
                      gradientDirection: customThemeEditor.gradientDirection,
                      color1: customThemeEditor.color1,
                      color2: customThemeEditor.color2
                    };

                    const tags = migrateToArray(frag.tags);
                    const topStyle = { 
                      background: tempTheme.isGradient ? `linear-gradient(${tempTheme.gradientDirection || 'to right'}, ${tempTheme.color1}, ${tempTheme.color2})` : tempTheme.top,
                      color: tempTheme.text,
                      borderColor: tempTheme.border
                    };
                    const bottomStyle = { 
                      backgroundColor: tempTheme.bottom,
                      borderColor: tempTheme.border
                    };
                    const tagStyle = { backgroundColor: tempTheme.tagBg, color: tempTheme.tagText, borderColor: tempTheme.border };

                    return (
                      <div className="flex flex-col h-full bg-app-card rounded-[2rem] shadow-2xl overflow-hidden border" style={{ borderColor: tempTheme.border }}>
                        <div className="p-8 flex flex-col relative overflow-hidden" style={topStyle}>
                          {/* Decorative Element */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                          
                          <div className="relative z-10">
                            <h3 className="text-2xl font-bold tracking-tight leading-tight transition-colors line-clamp-1" style={{ color: tempTheme.nameText || tempTheme.text }}>
                              {frag.name}
                            </h3>
                            {frag.house && (
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-1 opacity-80" style={{ color: tempTheme.houseText || tempTheme.subText }}>{frag.house}</p>
                            )}
                          </div>

                          {frag.originalScent && (
                            <div className="mt-6 relative z-10">
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium bg-white/10 backdrop-blur-md border border-white/10" style={{ color: tempTheme.inspiredText || tempTheme.text }}>
                                <Sparkles size={10} className="opacity-70" />
                                <span className="opacity-70">Inspired by</span>
                                <span className="font-bold">{frag.originalScent}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-8 flex flex-col flex-1 relative border-t" style={{ ...bottomStyle, borderTopColor: tempTheme.border }}>
                          <div className="mb-6">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: tempTheme.accent }} />
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60" style={{ color: tempTheme.text }}>Scent Profile</span>
                            </div>
                            <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm border" style={tagStyle}>
                              {frag.smellProfile || 'Scent Profile'}
                            </span>
                          </div>
                          <div className="mt-auto pt-6 border-t" style={{ borderColor: tempTheme.border }}>
                            <div className="flex flex-wrap gap-2">
                              {tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border" style={tagStyle}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {ConfirmModal}

      <TutorialModal 
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        title="Fragrance Database Guide"
        steps={tutorialSteps}
      />
    </div>
  );
}
