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
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const CATEGORIES = ['Medicamento', 'Insumo', 'Equipamento', 'Descartável', 'Cosmético', 'Outro'];

export default function Stock() {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: async () => (await supabase.from('materials').select('*').order('name')).data || [] });
  const { data: movements = [] } = useQuery({ queryKey: ['stock-movements'], queryFn: async () => (await supabase.from('stock_movements').select('*').order('created_at', { ascending: false })).data || [] });

  const createMaterialMutation = useMutation({
    mutationFn: async (data) => { const { error } = await supabase.from('materials').insert([data]); if(error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setIsProductModalOpen(false); toast.success('Produto cadastrado'); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { const { error } = await supabase.from('materials').delete().eq('id', id); if(error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setDeleteProduct(null); toast.success('Excluído'); }
  });

  const createMovementMutation = useMutation({
    mutationFn: async (data) => {
      const material = materials.find(m => m.id === data.material_id);
      let newStock = Number(material.stock_quantity) || 0;
      const qtd = Number(data.quantity);
      if (data.type === 'entrada') newStock += qtd;
      else if (data.type === 'saida') newStock -= qtd;
      else newStock = qtd; // ajuste

      await supabase.from('stock_movements').insert([{ ...data, material_name: material.name, previous_stock: material.stock_quantity, new_stock: newStock }]);
      await supabase.from('materials').update({ stock_quantity: newStock }).eq('id', data.material_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] }); queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setIsMovementModalOpen(false); toast.success('Movimentação registrada');
    }
  });

  const filteredMaterials = materials.filter(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque" subtitle="Controle de insumos" action={<div className="flex gap-2"><Button variant="outline" onClick={() => setIsMovementModalOpen(true)}><History className="w-4 h-4 mr-2" />Movimentação</Button><Button onClick={() => setIsProductModalOpen(true)} className="bg-stone-800"><Plus className="w-4 h-4 mr-2" />Novo Produto</Button></div>} />
      
      <Tabs defaultValue="inventory">
        <TabsList><TabsTrigger value="inventory">Inventário</TabsTrigger><TabsTrigger value="movements">Histórico</TabsTrigger></TabsList>
        
        <TabsContent value="inventory" className="space-y-4 mt-4">
          <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" /><Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" /></div>
          <div className="grid gap-3">
            {filteredMaterials.map(mat => (
              <Card key={mat.id} className="hover:shadow-sm"><CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-lg">{mat.name}</h3>
                  <div className="flex gap-2 text-sm text-stone-500"><span>{mat.category}</span><span>•</span><span>Min: {mat.minimum_stock}</span><span>•</span><span>R$ {Number(mat.cost_per_unit).toFixed(2)}/un</span></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-xl font-bold ${mat.stock_quantity <= mat.minimum_stock ? 'text-amber-600' : 'text-stone-800'}`}>{mat.stock_quantity} {mat.unit}</span>
                    {mat.stock_quantity <= mat.minimum_stock && <div className="flex items-center text-xs text-amber-600"><AlertTriangle className="w-3 h-3 mr-1" />Baixo</div>}
                  </div>
                  <Button size="icon" variant="ghost" className="text-rose-500" onClick={() => setDeleteProduct(mat)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="grid gap-3">
            {movements.map(mov => (
              <Card key={mov.id}><CardContent className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${mov.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {mov.type === 'entrada' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                  </div>
                  <div><p className="font-medium">{mov.material_name}</p><p className="text-xs text-stone-500">{format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm')} - {mov.reason}</p></div>
                </div>
                <div className="text-right"><p className="font-bold">{mov.type === 'entrada' ? '+' : '-'}{mov.quantity}</p><p className="text-xs text-stone-400">{mov.previous_stock} → {mov.new_stock}</p></div>
              </CardContent></Card>
            ))}
          </div>
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
      <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4">
        <Input placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        <div className="grid grid-cols-2 gap-4">
          <Select onValueChange={v => setFormData({...formData, category: v})}><SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="Unidade (ml, un)" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input type="number" placeholder="Custo" value={formData.cost_per_unit} onChange={e => setFormData({...formData, cost_per_unit: e.target.value})} />
          <Input type="number" placeholder="Qtd Atual" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} />
          <Input type="number" placeholder="Mínimo" value={formData.minimum_stock} onChange={e => setFormData({...formData, minimum_stock: e.target.value})} />
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Salvar</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}

function MovementModal({ open, onClose, materials, onSave }) {
  const [formData, setFormData] = useState({ material_id: '', type: 'entrada', quantity: '', reason: '' });
  return (
    <Dialog open={open} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
      <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4">
        <Select onValueChange={v => setFormData({...formData, material_id: v})}><SelectTrigger><SelectValue placeholder="Selecione o Produto" /></SelectTrigger><SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
        <div className="grid grid-cols-2 gap-4">
          <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent></Select>
          <Input type="number" placeholder="Quantidade" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} required />
        </div>
        <Input placeholder="Motivo" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" className="bg-stone-800">Registrar</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}