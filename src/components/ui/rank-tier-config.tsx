'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  BookOpen, 
  Star, 
  Zap,
  ChevronRight 
} from 'lucide-react';

interface RankTierConfig {
  rank: number;
  title: string;
  genEd: number;
  profEd: number;
  spec: number;
  color: string;
  bgGradient: string;
}

const DEFAULT_TIERS: RankTierConfig[] = [
  { 
    rank: 1, 
    title: "Novice Candidate", 
    genEd: 10, 
    profEd: 10, 
    spec: 10,
    color: 'text-slate-600',
    bgGradient: 'from-slate-500/10 to-slate-600/5'
  },
  { 
    rank: 3, 
    title: "Junior Intern", 
    genEd: 25, 
    profEd: 25, 
    spec: 25,
    color: 'text-green-600',
    bgGradient: 'from-green-500/10 to-green-600/5'
  },
  { 
    rank: 5, 
    title: "Aspiring Professional", 
    genEd: 50, 
    profEd: 50, 
    spec: 50,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500/10 to-blue-600/5'
  },
  { 
    rank: 7, 
    title: "Qualified Educator", 
    genEd: 75, 
    profEd: 75, 
    spec: 75,
    color: 'text-purple-600',
    bgGradient: 'from-purple-500/10 to-purple-600/5'
  },
  { 
    rank: 9, 
    title: "Subject Specialist", 
    genEd: 100, 
    profEd: 100, 
    spec: 100,
    color: 'text-amber-600',
    bgGradient: 'from-amber-500/10 to-amber-600/5'
  },
  { 
    rank: 10, 
    title: "Master Candidate", 
    genEd: 150, 
    profEd: 150, 
    spec: 150,
    color: 'text-emerald-600',
    bgGradient: 'from-emerald-500/10 to-emerald-600/5'
  },
];

interface RankTierInputProps {
  value?: Record<number, { genEd: number; profEd: number; spec: number }>;
  onChange?: (value: Record<number, { genEd: number; profEd: number; spec: number }>) => void;
  disabled?: boolean;
}

export function RankTierInput({ value = {}, onChange, disabled = false }: RankTierInputProps) {
  // Merge default tiers with custom values
  const tiers = DEFAULT_TIERS.map(tier => ({
    ...tier,
    genEd: value[tier.rank]?.genEd ?? tier.genEd,
    profEd: value[tier.rank]?.profEd ?? tier.profEd,
    spec: value[tier.rank]?.spec ?? tier.spec,
  }));

  const handleChange = (rank: number, field: 'genEd' | 'profEd' | 'spec', newValue: number) => {
    if (!onChange) return;
    
    const currentValue = value[rank] || { genEd: 0, profEd: 0, spec: 0 };
    const newValueObj = { ...currentValue, [field]: newValue };
    
    onChange({
      ...value,
      [rank]: newValueObj
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">
            Question Limits by Rank
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
          Configure how many questions each rank tier can access per category. Full LET = 150 per category.
        </p>
      </div>

      <div className="grid gap-4">
        {tiers.map((tier, index) => {
          const nextTier = tiers[index + 1];
          const rankRange = nextTier ? `Rank ${tier.rank}-${nextTier.rank - 1}` : `Rank ${tier.rank}+`;
          const total = tier.genEd + tier.profEd + tier.spec;

          return (
            <Card 
              key={tier.rank} 
              className={`overflow-hidden bg-gradient-to-br ${tier.bgGradient} border-2 border-border/30`}
            >
              <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-background/50 shadow-sm ${tier.color}`}>
                      {tier.rank === 10 ? (
                        <Star className="w-5 h-5" />
                      ) : tier.rank === 1 ? (
                        <GraduationCap className="w-5 h-5" />
                      ) : tier.rank === 5 ? (
                        <BookOpen className="w-5 h-5" />
                      ) : (
                        <span className="font-black text-sm">{tier.rank}</span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                        {rankRange}
                        <Badge variant="secondary" className="text-[9px] font-black bg-background/50">
                          {total} total
                        </Badge>
                      </CardTitle>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {tier.title}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
                      Gen Ed
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={150}
                      value={tier.genEd}
                      onChange={(e) => handleChange(tier.rank, 'genEd', parseInt(e.target.value) || 10)}
                      disabled={disabled}
                      className="h-10 text-center font-black text-sm border-2 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                      Prof Ed
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={150}
                      value={tier.profEd}
                      onChange={(e) => handleChange(tier.rank, 'profEd', parseInt(e.target.value) || 10)}
                      disabled={disabled}
                      className="h-10 text-center font-black text-sm border-2 focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                      Spec
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={150}
                      value={tier.spec}
                      onChange={(e) => handleChange(tier.rank, 'spec', parseInt(e.target.value) || 10)}
                      disabled={disabled}
                      className="h-10 text-center font-black text-sm border-2 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black text-foreground">Progressive Unlocking</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Users unlock more questions as they rank up. At <span className="text-primary font-black">Rank 10+</span>, 
              users can access the full 150 questions per category (450 total for full simulation), matching the actual LET exam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

