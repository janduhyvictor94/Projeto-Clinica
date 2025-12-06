import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Syringe, Package, DollarSign, Archive, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";

export default function Settings() {
  const [procModal, setProcModal] = useState(false);
  const [matModal, setMatModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: procedures = [] } = useQuery({ queryKey: ['procedures'], queryFn: async () => (await supabase.from('procedures').select('*').order('name')).data || [] });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*').order('name')).data || [] });

  const createProcMutation = useMutation({ mutationFn: async (data) => { await supabase.from('procedures').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); setProcModal(false); toast.success('Procedimento salvo!'); } });
  
  const updateProcMutation = useMutation({
    mutationFn: async ({ id, data }) => { await supabase.from('procedures').update(data).eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['procedures'] }); setEditingProcedure(null); toast.success('Atualizado!'); } 
  });

  const createMatMutation = useMutation({ mutationFn: async (data) => { await supabase.from('materials').insert([data]); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setMatModal(false); toast.success('Material salvo!'); } });
  
  const updateMatMutation = useMutation({
    mutationFn: async ({ id, data }) => { await supabase.from('materials').update(data).eq('id', id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setEditingMaterial(null); toast.success('Atualizado!'); } 
  });

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
          <div className="flex justify-end"><Button onClick={() => setProcModal(true)} className="bg-stone-800 hover:bg-stone-900 shadow-sm"><Plus className="w-4 h-4 mr-2" />Novo Procedimento</Button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {procedures.map(p => (
              <Card key={p.id} className="hover:shadow-md transition-all border-stone-100 group">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-stone-50 rounded-lg"><Syringe className="w-5 h-5 text-stone-500" /></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingProcedure(p)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteItem({ id: p.id, type: 'proc' })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div><h3 className="font-bold text-stone-800 text-lg line-clamp-1">{p.name}</h3><p className="text-sm text-stone-500 line-clamp-2 min-h-[20px]">{p.description || "Sem descrição"}</p></div>
                  <div className="pt-3 border-t border-stone-100 flex items-center gap-2 font-medium text-stone-700"><DollarSign className="w-4 h-4 text-emerald-500" />{Number(p.default_price).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="materials" className="mt-6 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setMatModal(true)} className="bg-stone-800 hover:bg-stone-900 shadow-sm"><Plus className="w-4 h-4 mr-2" />Novo Material</Button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map(m => (
              <Card key={m.id} className="hover:shadow-md transition-all border-stone-100 group">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-stone-50 rounded-lg"><Package className="w-5 h-5 text-stone-500" /></div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingMaterial(m)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteItem({ id: m.id, type: 'mat' })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
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

      <ProcedureModal 
        open={procModal || !!editingProcedure} 
        onClose={() => { setProcModal(false); setEditingProcedure(null); }} 
        procedure={editingProcedure} 
        onSave={d => { if(editingProcedure) updateProcMutation.mutate({id: editingProcedure.id, data: d}); else createProcMutation.mutate(d); }} 
        isLoading={createProcMutation.isPending || updateProcMutation.isPending} 
      />

      <MaterialModal 
        open={matModal || !!editingMaterial} 
        onClose={() => { setMatModal(false); setEditingMaterial(null); }} 
        material={editingMaterial} 
        onSave={d => { if(editingMaterial) updateMatMutation.mutate({id: editingMaterial.id, data: d}); else createMatMutation.mutate(d); }} 
        isLoading={createMatMutation.isPending || updateMatMutation.isPending} 
      />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este item?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteItem)} className="bg-rose-600 hover:bg-rose-700">Sim, Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function ProcedureModal({ open, onClose, procedure, onSave, isLoading }) {
  const [formData, setFormData] = useState({ name: '', description: '', default_price: '', duration_minutes: '' });

  React.useEffect(() => {
    if (procedure) {
      setFormData({ name: procedure.name || '', description: procedure.description || '', default_price: procedure.default_price || '', duration_minutes: procedure.duration_minutes || '' });
    } else {
      setFormData({ name: '', description: '', default_price: '', duration_minutes: '' });
    }
  }, [procedure, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, default_price: parseFloat(formData.default_price) || 0, duration_minutes: parseInt(formData.duration_minutes) || null, is_active: true });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
        <div><Label>Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Preço Padrão *</Label><Input type="number" step="0.01" value={formData.default_price} onChange={(e) => setFormData({ ...formData, default_price: e.target.value })} required /></div>
          <div><Label>Duração (minutos)</Label><Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isLoading} className="bg-stone-800 hover:bg-stone-900">{isLoading ? 'Salvando...' : 'Salvar'}</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}

function MaterialModal({ open, onClose, material, onSave, isLoading }) {
  const [formData, setFormData] = useState({ name: '', description: '', unit: '', cost_per_unit: '', stock_quantity: '' });

  React.useEffect(() => {
    if (material) {
      setFormData({ name: material.name || '', description: material.description || '', unit: material.unit || '', cost_per_unit: material.cost_per_unit || '', stock_quantity: material.stock_quantity || '' });
    } else {
      setFormData({ name: '', description: '', unit: 'ml', cost_per_unit: '', stock_quantity: '' });
    }
  }, [material, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, cost_per_unit: parseFloat(formData.cost_per_unit) || 0, stock_quantity: parseFloat(formData.stock_quantity) || 0, is_active: true });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>{material ? 'Editar Material' : 'Novo Material'}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><Label>Nome *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
        <div><Label>Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Unidade</Label><Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="ml, un, etc" /></div>
          <div><Label>Custo/Un *</Label><Input type="number" step="0.01" value={formData.cost_per_unit} onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })} required /></div>
          <div><Label>Estoque</Label><Input type="number" step="0.01" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={isLoading} className="bg-stone-800 hover:bg-stone-900">{isLoading ? 'Salvando...' : 'Salvar'}</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}