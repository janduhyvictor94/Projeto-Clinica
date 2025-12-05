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
import { Plus, Trash2, Syringe, Package } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Settings() {
  const [procModal, setProcModal] = useState(false);
  const [matModal, setMatModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: procedures = [] } = useQuery({ queryKey: ['procedures'], queryFn: async () => (await supabase.from('procedures').select('*')).data || [] });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*')).data || [] });

  const createProcMutation = useMutation({ mutationFn: async (data) => { await supabase.from('procedures').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); setProcModal(false); toast.success('Salvo!'); } });
  const createMatMutation = useMutation({ mutationFn: async (data) => { await supabase.from('materials').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setMatModal(false); toast.success('Salvo!'); } });
  const deleteMutation = useMutation({ mutationFn: async ({ id, type }) => { await supabase.from(type === 'proc' ? 'procedures' : 'materials').delete().eq('id', id); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); queryClient.invalidateQueries({ queryKey: ['materials'] }); setDeleteItem(null); toast.success('Excluído!'); } });

  return (
    <div className="space-y-6">
      <PageHeader title="Cadastros" subtitle="Configure seus serviços e produtos" />
      
      <Tabs defaultValue="procedures" className="w-full">
        <TabsList className="bg-stone-100 p-1 rounded-lg">
            <TabsTrigger value="procedures" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all">Procedimentos</TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all">Materiais</TabsTrigger>
        </TabsList>
        
        <TabsContent value="procedures" className="mt-6 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setProcModal(true)} className="bg-stone-800 hover:bg-stone-900"><Plus className="w-4 h-4 mr-2" />Novo Procedimento</Button></div>
          <div className="grid gap-3">
            {procedures.map(p => (
              <Card key={p.id} className="hover:shadow-sm border-stone-100"><CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4"><div className="p-3 bg-blue-50 rounded-lg"><Syringe className="w-5 h-5 text-blue-600" /></div><div><p className="font-bold text-stone-800">{p.name}</p><p className="text-sm text-stone-500">Valor Base: R$ {Number(p.default_price).toFixed(2)}</p></div></div>
                <Button variant="ghost" size="icon" className="text-rose-400 hover:bg-rose-50" onClick={() => setDeleteItem({ id: p.id, type: 'proc' })}><Trash2 className="w-4 h-4" /></Button>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="materials" className="mt-6 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setMatModal(true)} className="bg-stone-800 hover:bg-stone-900"><Plus className="w-4 h-4 mr-2" />Novo Material</Button></div>
          <div className="grid gap-3">
            {materials.map(m => (
              <Card key={m.id} className="hover:shadow-sm border-stone-100"><CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4"><div className="p-3 bg-emerald-50 rounded-lg"><Package className="w-5 h-5 text-emerald-600" /></div><div><p className="font-bold text-stone-800">{m.name}</p><p className="text-sm text-stone-500">Estoque Inicial: {m.stock_quantity} {m.unit}</p></div></div>
                <Button variant="ghost" size="icon" className="text-rose-400 hover:bg-rose-50" onClick={() => setDeleteItem({ id: m.id, type: 'mat' })}><Trash2 className="w-4 h-4" /></Button>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <SimpleModal open={procModal} onClose={() => setProcModal(false)} title="Novo Procedimento" onSave={d => createProcMutation.mutate(d)} fields={[{name: 'name', label: 'Nome'}, {name: 'default_price', label: 'Preço Padrão', type: 'number'}]} />
      <SimpleModal open={matModal} onClose={() => setMatModal(false)} title="Novo Material" onSave={d => createMatMutation.mutate(d)} fields={[{name: 'name', label: 'Nome'}, {name: 'unit', label: 'Unidade'}, {name: 'cost_per_unit', label: 'Custo/Un', type: 'number'}, {name: 'stock_quantity', label: 'Estoque', type: 'number'}]} />
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteItem)}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function SimpleModal({ open, onClose, title, onSave, fields }) {
  const [data, setData] = useState({});
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); onSave(data); }} className="space-y-4 pt-4">{fields.map(f => (<div key={f.name}><Label>{f.label}</Label><Input type={f.type || 'text'} onChange={e => setData({...data, [f.name]: e.target.value})} required className="mt-1" /></div>))}<div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Salvar</Button></div></form></DialogContent></Dialog>
  );
}