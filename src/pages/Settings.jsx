import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Syringe, Package, DollarSign, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

export default function Settings() {
  const [procModal, setProcModal] = useState(false);
  const [matModal, setMatModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: procedures = [] } = useQuery({ queryKey: ['procedures'], queryFn: async () => (await supabase.from('procedures').select('*').order('name')).data || [] });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*').order('name')).data || [] });

  const createProcMutation = useMutation({ mutationFn: async (data) => { await supabase.from('procedures').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); setProcModal(false); toast.success('Procedimento salvo!'); } });
  const createMatMutation = useMutation({ mutationFn: async (data) => { await supabase.from('materials').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setMatModal(false); toast.success('Material salvo!'); } });
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }) => { await supabase.from(type === 'proc' ? 'procedures' : 'materials').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); queryClient.invalidateQueries({ queryKey: ['materials'] }); setDeleteItem(null); toast.success('Item excluído!'); }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Cadastros" subtitle="Gerencie seus serviços e catálogo de produtos" />
      
      <Tabs defaultValue="procedures" className="w-full">
        <TabsList className="bg-stone-100 p-1 rounded-lg w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="procedures" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6 py-2 text-sm font-medium transition-all flex gap-2 items-center justify-center"><Syringe className="w-4 h-4" /> Procedimentos</TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-6 py-2 text-sm font-medium transition-all flex gap-2 items-center justify-center"><Package className="w-4 h-4" /> Materiais</TabsTrigger>
        </TabsList>
        
        <TabsContent value="procedures" className="mt-6 space-y-4">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3 text-blue-800"><div className="p-2 bg-white rounded-full"><Syringe className="w-5 h-5" /></div><div><p className="font-semibold">Catálogo de Procedimentos</p><p className="text-xs opacity-80">{procedures.length} cadastrados</p></div></div>
            <Button onClick={() => setProcModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" />Novo</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {procedures.map(p => (
              <Card key={p.id} className="hover:shadow-md transition-all border-stone-100 group">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-stone-50 rounded-lg"><Syringe className="w-5 h-5 text-stone-500" /></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteItem({ id: p.id, type: 'proc' })}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div><h3 className="font-bold text-stone-800 text-lg line-clamp-1" title={p.name}>{p.name}</h3><p className="text-sm text-stone-500 line-clamp-2 min-h-[20px]">{p.description || "Sem descrição"}</p></div>
                  <div className="pt-3 border-t border-stone-100 flex items-center gap-2 font-medium text-stone-700"><DollarSign className="w-4 h-4 text-emerald-500" />{Number(p.default_price).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="materials" className="mt-6 space-y-4">
          <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3 text-emerald-800"><div className="p-2 bg-white rounded-full"><Package className="w-5 h-5" /></div><div><p className="font-semibold">Insumos e Produtos</p><p className="text-xs opacity-80">{materials.length} cadastrados</p></div></div>
            <Button onClick={() => setMatModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"><Plus className="w-4 h-4 mr-2" />Novo</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map(m => (
              <Card key={m.id} className="hover:shadow-md transition-all border-stone-100 group">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-stone-50 rounded-lg"><Package className="w-5 h-5 text-stone-500" /></div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteItem({ id: m.id, type: 'mat' })}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div><h3 className="font-bold text-stone-800 text-lg line-clamp-1">{m.name}</h3><div className="flex gap-2 mt-1"><span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-600">{m.category || 'Geral'}</span></div></div>
                  <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm text-stone-500"><Archive className="w-4 h-4" />Estoque: <strong className="text-stone-700">{m.stock_quantity} {m.unit}</strong></div>
                    <span className="text-sm font-medium text-emerald-600">R$ {Number(m.cost_per_unit).toFixed(2)}/un</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <SimpleModal open={procModal} onClose={() => setProcModal(false)} title="Novo Procedimento" onSave={d => createProcMutation.mutate(d)} fields={[{name: 'name', label: 'Nome do Procedimento'}, {name: 'description', label: 'Descrição (Opcional)'}, {name: 'default_price', label: 'Preço Padrão (R$)', type: 'number'}]} />
      <SimpleModal open={matModal} onClose={() => setMatModal(false)} title="Novo Material" onSave={d => createMatMutation.mutate(d)} fields={[{name: 'name', label: 'Nome do Produto'}, {name: 'category', label: 'Categoria'}, {name: 'unit', label: 'Unidade (ex: ml, un)'}, {name: 'cost_per_unit', label: 'Custo por Unidade (R$)', type: 'number'}, {name: 'stock_quantity', label: 'Estoque Inicial', type: 'number'}]} />
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este item? Isso pode afetar históricos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(deleteItem)} className="bg-rose-600 hover:bg-rose-700">Sim, Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function SimpleModal({ open, onClose, title, onSave, fields }) {
  const [data, setData] = useState({});
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); onSave(data); }} className="space-y-4 py-2">{fields.map(f => (<div key={f.name} className="grid gap-1"><Label>{f.label}</Label><Input type={f.type || 'text'} onChange={e => setData({...data, [f.name]: e.target.value})} required={f.name !== 'description'} /></div>))}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800 hover:bg-stone-900">Salvar</Button></div></form></DialogContent></Dialog>
  );
}