import assert from 'node:assert/strict';
export const WORLD_START_V24=Date.parse('2026-10-19T03:00:00Z'),DAY_V24=86400000;
// Fixed before the new campaigns. Do not select cases after observing their outcomes.
export const NEW_CASES_V24=Object.freeze([
 {schedule:'best',build:'swift',seed:17,startHour:0},
 {schedule:'best',build:'swift',seed:1337,startHour:0},
 {schedule:'casual',build:'swift',seed:17,startHour:0},
 {schedule:'casual',build:'swift',seed:17,startHour:12},
 {schedule:'casual',build:'swift',seed:17,startHour:20},
 {schedule:'casual',build:'swift',seed:4213,startHour:12},
 {schedule:'casual',build:'swift',seed:4213,startHour:20},
].map(Object.freeze));
export const INHERITED_CASES_V24=Object.freeze([
 {schedule:'best',build:'swift',seed:1,startHour:0},
 {schedule:'best',build:'swift',seed:4213,startHour:0},
 {schedule:'best',build:'swift',seed:3735928559,startHour:0},
 {schedule:'regular',build:'swift',seed:4213,startHour:0},
 {schedule:'casual',build:'swift',seed:4213,startHour:0},
 {schedule:'best',build:'balanced',seed:4213,startHour:0},
 {schedule:'best',build:'brute',seed:4213,startHour:0},
].map(Object.freeze));
export function caseKeyV24(c){validateCaseV24(c);return `${c.schedule}-${c.build}-${c.seed}-h${String(c.startHour).padStart(2,'0')}`;}
export function validateCaseV24(c){assert.ok(['best','regular','casual'].includes(c.schedule));assert.ok(['swift','balanced','brute'].includes(c.build));assert.ok(Number.isInteger(c.seed)&&c.seed>0&&c.seed<=4294967295);assert.ok([0,12,20].includes(c.startHour));assert.ok(c.schedule==='casual'||c.startHour===0);return true;}
export const PANEL_PROTOCOL_V24=Object.freeze({version:'progression-panel-v24-1',days:120,minimumPrimaryBenefit:0.01,newCases:NEW_CASES_V24,inheritedCases:INHERITED_CASES_V24,formula:'progression-bonus-v22-1',creation:'world Monday00h plus startHour; each observation cycle is24h since creation',guild:'same global Oct26 midnight boundary for every arm; hypothetical rank1, not acquired membership',event:'daily12h–18h America/Sao_Paulo; online only',criteria:'V22 endpoint non-regression and1percent primary benefit, every case; keep negative seed3735928559; no inference of population approval',runtimeEnabled:false,balanceApproved:false,activationReady:false});
