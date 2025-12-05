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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Settings() {
  const [procModal, setProcModal] = useState(false);
  const [matModal, setMatModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null); // { id, type: 'proc' | 'mat' }
  const queryClient = useQueryClient();

  const { data: procedures = [] } = useQuery({ queryKey: ['procedures'], queryFn: async () => (await supabase.from('procedures').select('*')).data || [] });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*')).data || [] });

  const createProcMutation = useMutation({ mutationFn: async (data) => { await supabase.from('procedures').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); setProcModal(false); toast.success('Salvo!'); } });
  const createMatMutation = useMutation({ mutationFn: async (data) => { await supabase.from('materials').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setMatModal(false); toast.success('Salvo!'); } });
  
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }) => { await supabase.from(type === 'proc' ? 'procedures' : 'materials').delete().eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); queryClient.invalidateQueries({ queryKey: ['materials'] }); setDeleteItem(null); toast.success('Excluído!'); }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Cadastros" subtitle="Configurações do sistema" />
      
      <Tabs defaultValue="procedures">
        <TabsList><TabsTrigger value="procedures">Procedimentos</TabsTrigger><TabsTrigger value="materials">Materiais</TabsTrigger></TabsList>
        
        <TabsContent value="procedures" className="mt-4 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setProcModal(true)} className="bg-stone-800"><Plus className="w-4 h-4 mr-2" />Novo</Button></div>
          <div className="grid gap-2">
            {procedures.map(p => (
              <Card key={p.id}><CardContent className="p-3 flex justify-between items-center">
                <div className="flex items-center gap-3"><div className="p-2 bg-stone-100 rounded"><Syringe className="w-4 h-4" /></div><div><p className="font-medium">{p.name}</p><p className="text-sm text-stone-500">R$ {Number(p.default_price).toFixed(2)}</p></div></div>
                <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => setDeleteItem({ id: p.id, type: 'proc' })}><Trash2 className="w-4 h-4" /></Button>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="materials" className="mt-4 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setMatModal(true)} className="bg-stone-800"><Plus className="w-4 h-4 mr-2" />Novo</Button></div>
          <div className="grid gap-2">
            {materials.map(m => (
              <Card key={m.id}><CardContent className="p-3 flex justify-between items-center">
                <div className="flex items-center gap-3"><div className="p-2 bg-stone-100 rounded"><Package className="w-4 h-4" /></div><div><p className="font-medium">{m.name}</p><p className="text-sm text-stone-500">{m.unit} - R$ {Number(m.cost_per_unit).toFixed(2)}</p></div></div>
                <Button variant="ghost" size="icon" className="text-rose-500" onClick={() => setDeleteItem({ id: m.id, type: 'mat' })}><Trash2 className="w-4 h-4" /></Button>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <SimpleModal open={procModal} onClose={() => setProcModal(false)} title="Novo Procedimento" onSave={d => createProcMutation.mutate(d)} fields={[{name: 'name', label: 'Nome'}, {name: 'default_price', label: 'Preço Padrão', type: 'number'}]} />
      <SimpleModal open={matModal} onClose={() => setMatModal(false)} title="Novo Material" onSave={d => createMatMutation.mutate(d)} fields={[{name: 'name', label: 'Nome'}, {name: 'unit', label: 'Unidade'}, {name: 'cost_per_unit', label: 'Custo/Un', type: 'number'}, {name: 'stock_quantity', label: 'Estoque Inicial', type: 'number'}]} />
      
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteItem)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function SimpleModal({ open, onClose, title, onSave, fields }) {
  const [data, setData] = useState({});
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); onSave(data); }} className="space-y-4">
        {fields.map(f => (
          <div key={f.name}><Label>{f.label}</Label><Input type={f.type || 'text'} onChange={e => setData({...data, [f.name]: e.target.value})} required /></div>
        ))}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Salvar</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}