import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, UserCheck, TrendingUp, Package, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#c4a47c', '#78716c', '#a8a29e', '#e7e5e4', '#57534e'];

export default function Reports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: async () => (await supabase.from('appointments').select('*')).data || [] });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: async () => (await supabase.from('patients').select('*')).data || [] });
  const { data: stockMovements = [] } = useQuery({ queryKey: ['stock-movements'], queryFn: async () => (await supabase.from('stock_movements').select('*')).data || [] });

  const start = startOfYear(new Date(selectedYear, 0)); const end = endOfYear(new Date(selectedYear, 0));
  
  const filteredApps = appointments.filter(a => isWithinInterval(new Date(a.date+'T12:00:00'), { start, end }) && a.status === 'Realizado');
  const revenue = filteredApps.reduce((acc, a) => acc + (Number(a.final_value) || 0), 0);
  const materialCost = stockMovements.filter(m => isWithinInterval(new Date(m.created_at), { start, end }) && m.type === 'saida').reduce((acc, m) => acc + (Number(m.total_cost) || 0), 0);
  const profit = revenue - materialCost;
  
  const genderData = Object.entries(patients.reduce((acc, p) => { acc[p.gender || 'Outro'] = (acc[p.gender || 'Outro'] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const originData = Object.entries(patients.reduce((acc, p) => { acc[p.origin || 'Outro'] = (acc[p.origin || 'Outro'] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios e Análises" subtitle="Inteligência de negócio" action={<Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}><SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger><SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>} />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faturamento Bruto" value={`R$ ${revenue.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`} icon={TrendingUp} />
        <StatCard title="Custo Operacional" value={`R$ ${materialCost.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`} icon={Package} />
        <StatCard title="Lucro Líquido" value={`R$ ${profit.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`} icon={TrendingUp} className="text-emerald-600 border-emerald-100 bg-emerald-50/50" />
        <StatCard title="Atendimentos" value={filteredApps.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-stone-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-stone-500" /> Origem dos Pacientes</CardTitle></CardHeader>
            <CardContent className="h-80"><ResponsiveContainer><BarChart data={originData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} /><Tooltip cursor={{fill: '#f5f5f4'}} /><Bar dataKey="value" fill="#c4a47c" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        
        <Card className="border-stone-100 shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><PieIcon className="w-5 h-5 text-stone-500" /> Perfil por Gênero</CardTitle></CardHeader>
            <CardContent className="h-80"><ResponsiveContainer><PieChart><Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{genderData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-stone-900 text-white border-0 shadow-lg">
            <CardContent className="p-8 flex flex-col justify-center h-full">
                <div className="flex items-center gap-4 mb-6"><div className="p-3 bg-stone-800 rounded-full"><BarChart3 className="w-6 h-6 text-stone-200" /></div><h3 className="text-xl font-light">Indicadores Chave</h3></div>
                <div className="grid grid-cols-2 gap-8">
                    <div><p className="text-stone-400 text-sm mb-1">Ticket Médio</p><p className="text-3xl font-light">R$ {(revenue / (filteredApps.length || 1)).toLocaleString('pt-BR', {minimumFractionDigits: 0})}</p></div>
                    <div><p className="text-stone-400 text-sm mb-1">Novos Pacientes</p><p className="text-3xl font-light">{filteredApps.filter(a => a.is_new_patient).length}</p></div>
                    <div><p className="text-stone-400 text-sm mb-1">Taxa de Retorno</p><p className="text-3xl font-light">{((filteredApps.filter(a => !a.is_new_patient).length / (filteredApps.length || 1)) * 100).toFixed(0)}%</p></div>
                    <div><p className="text-stone-400 text-sm mb-1">Margem de Lucro</p><p className="text-3xl font-light text-emerald-400">{((profit / (revenue || 1)) * 100).toFixed(0)}%</p></div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="border-stone-100 shadow-sm">
            <CardHeader><CardTitle>Top Procedimentos (Receita)</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {Object.entries(filteredApps.reduce((acc, a) => { 
                        a.procedures_performed?.forEach(p => { acc[p.procedure_name] = (acc[p.procedure_name] || 0) + Number(p.price); }); 
                        return acc; 
                    }, {})).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, val], i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                            <div className="flex items-center gap-3"><span className="text-xs font-bold bg-white w-6 h-6 flex items-center justify-center rounded-full border border-stone-200 text-stone-500">{i+1}</span><span className="text-sm font-medium text-stone-700">{name}</span></div>
                            <span className="text-sm font-bold text-stone-800">R$ {val.toLocaleString('pt-BR')}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}