
export interface RankDefinition {
    name: string
    minXP: number
    color: string
}

export const RANKS: RankDefinition[] = [
    { name: 'Cosmic Deity', minXP: 2000000, color: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20' }, // 20
    { name: 'Galactic Warlord', minXP: 1000000, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' }, // 19
    { name: 'Grand Admiral', minXP: 750000, color: 'text-red-500 bg-red-500/10 border-red-500/20' }, // 18
    { name: 'Fleet Admiral', minXP: 500000, color: 'text-red-400 bg-red-400/10 border-red-400/20' }, // 17
    { name: 'Admiral', minXP: 300000, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' }, // 16
    { name: 'Vice Admiral', minXP: 200000, color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' }, // 15
    { name: 'Rear Admiral', minXP: 150000, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }, // 14
    { name: 'Commodore', minXP: 100000, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' }, // 13
    { name: 'Marshal', minXP: 70000, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' }, // 12
    { name: 'General', minXP: 50000, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' }, // 11
    { name: 'Brigadier', minXP: 35000, color: 'text-lime-500 bg-lime-500/10 border-lime-500/20' }, // 10
    { name: 'Colonel', minXP: 25000, color: 'text-lime-400 bg-lime-400/10 border-lime-400/20' }, // 9
    { name: 'Commander', minXP: 18000, color: 'text-green-500 bg-green-500/10 border-green-500/20' }, // 8
    { name: 'Major', minXP: 12000, color: 'text-green-400 bg-green-400/10 border-green-400/20' }, // 7
    { name: 'Captain', minXP: 8000, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }, // 6
    { name: 'Lieutenant', minXP: 5000, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }, // 5
    { name: 'Sergeant', minXP: 2500, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' }, // 4
    { name: 'Corporal', minXP: 1200, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' }, // 3
    { name: 'Private', minXP: 500, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' }, // 2
    { name: 'Recruit', minXP: 0, color: 'text-muted-foreground bg-muted border-border' }, // 1
]

export function getRankFromXP(xp: number): RankDefinition {
    // Find the highest rank where xp >= minXP
    return RANKS.find(r => xp >= r.minXP) || RANKS[RANKS.length - 1]
}
