import React, { useState } from 'react';
import { supabase } from '@/supabase.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle, History, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CATEGORIES = ['Medicamento', 'Insumo', 'Equipamento', 'Descartável', 'Cosmético', 'Outro'];

export default function Stock() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*').order('name')).data || [] });
  const { data: movements = [] } = useQuery({ queryKey: ['stock-movements'], queryFn: async () => (await supabase.from('stock_movements').select('*').order('created_at', { ascending: false })).data || [] });

  const createMaterialMutation = useMutation({ mutationFn: async (data) => { const { error } = await supabase.from('materials').insert([data]); if(error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setIsProductModalOpen(false); toast.success('Produto criado'); } });
  const createMovementMutation = useMutation({
    mutationFn: async (data) => {
      const material = materials.find(m => m.id === data.material_id);
      let newStock = Number(material.stock_quantity) || 0;
      const qtd = Number(data.quantity);
      if (data.type === 'entrada') newStock += qtd; else if (data.type === 'saida') newStock -= qtd; else newStock = qtd;
      await supabase.from('stock_movements').insert([{ ...data, material_name: material.name, previous_stock: material.stock_quantity, new_stock: newStock }]);
      await supabase.from('materials').update({ stock_quantity: newStock }).eq('id', data.material_id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); queryClient.invalidateQueries({ queryKey: ['stock-movements'] }); setIsMovementModalOpen(false); toast.success('Movimentação registrada'); }
  });
  const deleteMutation = useMutation({ mutationFn: async (id) => { const { error } = await supabase.from('materials').delete().eq('id', id); if(error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setDeleteProduct(null); toast.success('Excluído'); } });

  const filteredMaterials = materials.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const lowStock = materials.filter(m => m.stock_quantity <= m.minimum_stock);

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque" subtitle="Gestão de materiais e insumos" action={<div className="flex gap-2"><Button variant="outline" onClick={() => setIsMovementModalOpen(true)}><History className="w-4 h-4 mr-2" />Movimentação</Button><Button onClick={() => setIsProductModalOpen(true)} className="bg-stone-800 hover:bg-stone-900"><Plus className="w-4 h-4 mr-2" />Novo Produto</Button></div>} />
      
      {lowStock.length > 0 && (
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4 flex items-center gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5" /><div><p className="font-semibold">Atenção: Estoque Baixo</p><p className="text-sm">{lowStock.length} itens precisam de reposição.</p></div>
        </CardContent></Card>
      )}

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="bg-stone-100 p-1 rounded-lg">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all">Inventário</TabsTrigger>
            <TabsTrigger value="movements" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all">Histórico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="space-y-4 mt-6">
          <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" /><Input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-white" /></div>
          <div className="grid gap-3">
            {filteredMaterials.map(mat => (
              <Card key={mat.id} className="hover:shadow-md transition-shadow border-stone-100 group"><CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-stone-50 rounded-lg"><Package className="w-6 h-6 text-stone-400" /></div>
                    <div><h3 className="font-medium text-lg text-stone-800">{mat.name}</h3><div className="flex gap-3 text-sm text-stone-500"><span>{mat.category}</span><span>•</span><span>Min: {mat.minimum_stock}</span><span>•</span><span>R$ {Number(mat.cost_per_unit).toFixed(2)}/un</span></div></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${mat.stock_quantity <= mat.minimum_stock ? 'text-amber-600' : 'text-stone-700'}`}>{mat.stock_quantity}</span>
                    <span className="text-sm text-stone-400 ml-1">{mat.unit}</span>
                  </div>
                  <Button size="icon" variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteProduct(mat)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-6 space-y-3">
          {movements.map(mov => (
            <Card key={mov.id} className="border-stone-100"><CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${mov.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{mov.type === 'entrada' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}</div>
                <div><p className="font-medium text-stone-800">{mov.material_name}</p><p className="text-xs text-stone-500">{format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm')} • {mov.reason}</p></div>
              </div>
              <div className="text-right"><p className={`font-bold ${mov.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>{mov.type === 'entrada' ? '+' : '-'}{mov.quantity}</p><p className="text-xs text-stone-400">{mov.previous_stock} → {mov.new_stock}</p></div>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <ProductModal open={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={(d) => createMaterialMutation.mutate(d)} />
      <MovementModal open={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} materials={materials} onSave={(d) => createMovementMutation.mutate(d)} />
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}><AlertDialogContent><AlertDialogFooter><AlertDialogAction onClick={() => deleteMutation.mutate(deleteProduct.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function ProductModal({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({ name: '', unit: 'un', cost_per_unit: '', stock_quantity: '', minimum_stock: '', category: '' });
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4 pt-4">
        <div><Label>Nome</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Categoria</Label><Select onValueChange={v => setFormData({...formData, category: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Unidade</Label><Input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Custo</Label><Input type="number" value={formData.cost_per_unit} onChange={e => setFormData({...formData, cost_per_unit: e.target.value})} className="mt-1" /></div>
          <div><Label>Qtd Atual</Label><Input type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="mt-1" /></div>
          <div><Label>Mínimo</Label><Input type="number" value={formData.minimum_stock} onChange={e => setFormData({...formData, minimum_stock: e.target.value})} className="mt-1" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Salvar</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}

function MovementModal({ open, onClose, materials, onSave }) {
  const [formData, setFormData] = useState({ material_id: '', type: 'entrada', quantity: '', reason: '' });
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4 pt-4">
        <div><Label>Produto</Label><Select onValueChange={v => setFormData({...formData, material_id: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Tipo</Label><Select onValueChange={v => setFormData({...formData, type: v})}><SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent></Select></div>
          <div><Label>Quantidade</Label><Input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required className="mt-1" /></div>
        </div>
        <div><Label>Motivo</Label><Input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="mt-1" /></div>
        <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Registrar</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}