import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, UserCheck, TrendingUp, Package } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#c4a47c', '#78716c', '#d6d3d1', '#a8a29e'];

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('year');

  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: async () => (await supabase.from('appointments').select('*')).data || [] });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: async () => (await supabase.from('patients').select('*')).data || [] });
  const { data: stockMovements = [] } = useQuery({ queryKey: ['stock-movements'], queryFn: async () => (await supabase.from('stock_movements').select('*')).data || [] });

  const start = startOfYear(new Date(selectedYear, 0)); const end = endOfYear(new Date(selectedYear, 0));
  const filteredApps = appointments.filter(a => isWithinInterval(new Date(a.date+'T12:00:00'), { start, end }) && a.status === 'Realizado');
  const revenue = filteredApps.reduce((acc, a) => acc + (Number(a.final_value) || 0), 0);
  const materialCost = stockMovements.filter(m => isWithinInterval(new Date(m.created_at), { start, end }) && m.type === 'saida').reduce((acc, m) => acc + (Number(m.total_cost) || 0), 0);

  const genderData = Object.entries(patients.reduce((acc, p) => { acc[p.gender || 'Outro'] = (acc[p.gender || 'Outro'] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Performance da clínica" action={<Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}><SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger><SelectContent>{[2024, 2025].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>} />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faturamento Total" value={`R$ ${revenue.toLocaleString('pt-BR')}`} icon={TrendingUp} />
        <StatCard title="Custo Materiais" value={`R$ ${materialCost.toLocaleString('pt-BR')}`} icon={Package} />
        <StatCard title="Lucro Bruto" value={`R$ ${(revenue - materialCost).toLocaleString('pt-BR')}`} icon={TrendingUp} className="text-emerald-600" />
        <StatCard title="Atendimentos" value={filteredApps.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-stone-100"><CardHeader><CardTitle>Perfil de Gênero</CardTitle></CardHeader><CardContent className="h-64"><ResponsiveContainer><PieChart><Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{genderData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-gradient-to-br from-stone-800 to-stone-900 text-white border-0"><CardContent className="p-8 flex flex-col justify-center h-full"><div><p className="text-stone-400 mb-2">Ticket Médio</p><p className="text-4xl font-light">R$ {(revenue / (filteredApps.length || 1)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div><div className="mt-8"><p className="text-stone-400 mb-2">Total Pacientes</p><p className="text-4xl font-light">{patients.length}</p></div></CardContent></Card>
      </div>
    </div>
  );
}