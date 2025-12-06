import React, { useState } from 'react';
import { supabase } from '@/supabase.js'; // Conexão Supabase
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  // --- BUSCANDO AGENDAMENTOS NO SUPABASE ---
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: false });
      return data || [];
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getAppointmentsForDay = (date) => {
    return appointments.filter(a => {
        if (!a.date) return false;
        // Ajuste de fuso horário para garantir comparação correta
        const appointmentDate = new Date(a.date.includes('T') ? a.date : a.date + 'T00:00:00');
        return isSameDay(appointmentDate, date);
    });
  };

  const statusColors = {
    'Agendado': 'bg-blue-500',
    'Confirmado': 'bg-emerald-500',
    'Realizado': 'bg-stone-500',
    'Cancelado': 'bg-rose-500',
  };

  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  const handleYearChange = (year) => {
    setViewYear(parseInt(year));
    setCurrentDate(new Date(parseInt(year), currentDate.getMonth(), 1));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        subtitle="Visualize seus agendamentos"
        action={
          <Link to={createPageUrl('Appointments') + '?action=new'}>
            <Button className="bg-stone-800 hover:bg-stone-900">
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </Link>
        }
      />

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-100">
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-light text-stone-800 capitalize">
            {format(currentDate, 'MMMM', { locale: ptBR })}
          </span>
          <Select value={viewYear.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-24 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendar Grid - Desktop */}
      <Card className="bg-white border-stone-100 overflow-hidden hidden md:block">
        <CardContent className="p-0">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b border-stone-100">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="p-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {days.map((date, i) => {
              const dayAppointments = getAppointmentsForDay(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isToday = isSameDay(date, new Date());

              return (
                <div
                  key={i}
                  className={`min-h-24 p-2 border-b border-r border-stone-100 ${
                    !isCurrentMonth ? 'bg-stone-50/50' : ''
                  }`}
                >
                  <div className={`text-sm mb-1 ${
                    isToday 
                      ? 'w-7 h-7 flex items-center justify-center bg-stone-800 text-white rounded-full mx-auto'
                      : isCurrentMonth ? 'text-stone-700' : 'text-stone-300'
                  }`}>
                    {format(date, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-xs px-2 py-1 rounded truncate ${statusColors[apt.status] || 'bg-gray-400'} text-white`}
                      >
                        {apt.time && <span className="mr-1">{apt.time}</span>}
                        {apt.patient_name?.split(' ')[0]}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-stone-400 text-center">
                        +{dayAppointments.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid - Mobile (Compact) */}
      <Card className="bg-white border-stone-100 overflow-hidden md:hidden">
        <CardContent className="p-0">
          {/* Week Days Header - Mobile */}
          <div className="grid grid-cols-7 border-b border-stone-100">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="p-2 text-center text-xs font-medium text-stone-500">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid - Mobile */}
          <div className="grid grid-cols-7">
            {days.map((date, i) => {
              const dayAppointments = getAppointmentsForDay(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isToday = isSameDay(date, new Date());
              const hasAppointments = dayAppointments.length > 0;

              return (
                <div
                  key={i}
                  className={`min-h-14 p-1 border-b border-r border-stone-100 flex flex-col items-center ${
                    !isCurrentMonth ? 'bg-stone-50/50' : ''
                  }`}
                >
                  <div className={`text-xs w-6 h-6 flex items-center justify-center ${
                    isToday 
                      ? 'bg-stone-800 text-white rounded-full'
                      : isCurrentMonth ? 'text-stone-700' : 'text-stone-300'
                  }`}>
                    {format(date, 'd')}
                  </div>
                  {hasAppointments && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`w-1.5 h-1.5 rounded-full ${statusColors[apt.status] || 'bg-gray-400'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mobile: Day's Appointments List */}
      <div className="md:hidden space-y-3">
        <h3 className="text-sm font-medium text-stone-600 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Agendamentos do mês
        </h3>
        {appointments
          .filter(a => {
             if(!a.date) return false;
             // Ajuste de fuso
             const d = new Date(a.date.includes('T') ? a.date : a.date + 'T00:00:00');
             return isSameMonth(d, currentDate);
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((apt) => (
            <div
              key={apt.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone-100"
            >
              <div className={`w-2 h-full min-h-10 rounded-full ${statusColors[apt.status] || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{apt.patient_name}</p>
                <p className="text-xs text-stone-500">
                  {format(new Date(apt.date.includes('T') ? apt.date : apt.date + 'T00:00:00'), 'dd/MM')} {apt.time && `às ${apt.time}`}
                </p>
              </div>
              <Badge className={`${statusColors[apt.status] || 'bg-gray-400'} text-white text-xs`}>
                {apt.status}
              </Badge>
            </div>
          ))}
          {appointments.length === 0 && (
             <p className="text-center text-stone-400 py-6 text-sm">Nenhum agendamento carregado</p>
          )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-xs text-stone-500">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}