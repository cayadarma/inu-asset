"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, AlertTriangle, Clock, Box, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

interface NotificationItem {
  id: string;
  type: "damage" | "stock";
  title: string;
  urgency?: string;
  created_at: string;
  href: string;
  // damage
  assetName?: string;
  locationName?: string;
  // stock
  qty?: number;
  min_stock?: number;
  unit?: string;
  category?: string | null;
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Role-based visibility
  // - Operator: hanya notifikasi pemeliharaan (tidak ada stok menipis)
  // - Manajemen: hanya notifikasi stok menipis (tidak ada pemeliharaan)
  // - Super Admin & Administrator: ada semua notifikasi
  const canSeeMaint = user?.role !== "manajemen";
  const canSeeStock = user?.role !== "operator";

  const maintNotifOn = canSeeMaint && (user?.notification_settings?.notifMaint ?? true);
  const stockNotifOn = canSeeStock && (user?.notification_settings?.notifStock ?? true);

  const fetchNotifications = async () => {
    setIsLoading(true);

    const items: NotificationItem[] = [];

    // 1. Notifikasi Pemeliharaan (Laporan Kerusakan Buku Sakit)
    if (maintNotifOn) {
      const { data, error } = await supabase
        .from("damage_reports")
        .select(`
          *,
          assets (
            name,
            location_id,
            locations ( name )
          )
        `)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (!error && data) {
        data.forEach((notif) => {
          items.push({
            id: notif.id,
            type: "damage",
            title: notif.issue_title,
            urgency: notif.urgency,
            created_at: notif.created_at,
            assetName: notif.assets?.name,
            locationName: notif.assets?.locations?.name,
            href: `/buku-sakit/${notif.assets?.location_id}/${notif.asset_id}/${notif.id}?name=${encodeURIComponent(notif.assets?.locations?.name || "")}&assetName=${encodeURIComponent(notif.assets?.name || "")}&issueTitle=${encodeURIComponent(notif.issue_title)}`,
          });
        });
      }
    }

    // 2. Notifikasi Stok Menipis / Habis
    if (stockNotifOn) {
      const dismissedStock: string[] = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("dismissed_stock_notifs") || "[]")
        : [];

      const { data: stockData, error: stockError } = await supabase
        .from("stock_items")
        .select("id, name, category, qty, unit, min_stock, created_at")
        .order("created_at", { ascending: false });

      if (!stockError && stockData) {
        stockData
          .filter((item) => (item.qty || 0) <= (item.min_stock || 0) && !dismissedStock.includes(item.id))
          .forEach((item) => {
            const isOut = (item.qty || 0) <= 0;
            items.push({
              id: item.id,
              type: "stock",
              title: isOut ? `Stok Habis: ${item.name}` : `Stok Menipis: ${item.name}`,
              urgency: isOut ? "Kritis" : "Peringatan",
              created_at: item.created_at,
              category: item.category,
              qty: item.qty,
              min_stock: item.min_stock,
              unit: item.unit,
              href: `/stok/${item.id}`,
            });
          });
      }
    }

    // Urutkan berdasarkan created_at descending
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(items);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, maintNotifOn, stockNotifOn]);

  const markAsRead = async (id: string, type: "damage" | "stock") => {
    if (type === "damage") {
      const { error } = await supabase
        .from("damage_reports")
        .update({ is_read: true })
        .eq("id", id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        router.refresh();
      } else {
        alert("Gagal menghapus: " + error.message);
      }
    } else {
      const dismissed: string[] = JSON.parse(localStorage.getItem("dismissed_stock_notifs") || "[]");
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem("dismissed_stock_notifs", JSON.stringify(dismissed));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;

    const hasDamage = notifications.some((n) => n.type === "damage");
    if (hasDamage) {
      await supabase
        .from("damage_reports")
        .update({ is_read: true })
        .eq("is_read", false);
    }

    const stockIds = notifications.filter((n) => n.type === "stock").map((n) => n.id);
    if (stockIds.length > 0) {
      const dismissed: string[] = JSON.parse(localStorage.getItem("dismissed_stock_notifs") || "[]");
      const updated = Array.from(new Set([...dismissed, ...stockIds]));
      localStorage.setItem("dismissed_stock_notifs", JSON.stringify(updated));
    }

    setNotifications([]);
    router.refresh();
  };

  const anyCategoryActive = maintNotifOn || stockNotifOn;

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto pb-10 font-poppins text-left">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0D9488]/10 text-[#0D9488] rounded-2xl"><Bell size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">{t("notif.title")}</h1>
            <p className="text-[#475569] dark:text-[#94A3B8] text-sm font-medium">{t("notif.subtitle", { count: notifications.length })}</p>
          </div>
        </div>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all">
            <Trash2 size={18} /> {t("notif.clearAll")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="p-20 text-center dark:text-white">{t("notif.loading")}</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] p-20 rounded-3xl border border-dashed border-gray-200 dark:border-[#334155] text-[#94A3B8] text-center flex flex-col items-center gap-4">
             <Bell size={48} className="text-[#94A3B8]" />
             <p className="text-secondary dark:text-[#94A3B8] font-medium italic">{!anyCategoryActive ? t("notif.disabledHint") : t("notif.empty")}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={`${notif.type}-${notif.id}`} className="group relative">
              <Link 
                href={notif.href}
                className="block bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:border-[#0D9488] transition-all"
              >
                <div className="flex items-start gap-5 pr-12">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    notif.type === "stock"
                      ? ((notif.qty || 0) <= 0 ? "bg-red-50 dark:bg-red-950/30 text-red-500" : "bg-amber-50 dark:bg-amber-950/30 text-amber-500")
                      : (notif.urgency?.includes("Berat") ? "bg-red-50 dark:bg-red-950/30 text-red-500" : "bg-blue-50 dark:bg-blue-950/30 text-blue-500")
                  }`}>
                    {notif.type === "stock" ? <Box size={24} /> : (notif.urgency?.includes("Berat") ? <AlertTriangle size={24} /> : <Box size={24} />)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                        notif.type === "stock"
                          ? ((notif.qty || 0) <= 0 ? "text-red-600 bg-red-50 dark:bg-red-950/40" : "text-amber-600 bg-amber-50 dark:bg-amber-950/40")
                          : "text-red-600 bg-red-50 dark:bg-red-950/40"
                      }`}>
                        {notif.type === "stock" ? ((notif.qty || 0) <= 0 ? "Habis" : "Menipis") : notif.urgency?.split(" ")[0]}
                      </span>
                      <span className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-widest">
                        {notif.type === "stock" ? "Stok Barang" : t("notif.newReport")}
                      </span>
                    </div>
                    <h3 className="text-[16px] font-bold text-[#0F172A] dark:text-[#F8FAFC] group-hover:text-[#0D9488] transition-colors">{notif.title}</h3>
                    {notif.type === "stock" ? (
                      <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
                        Sisa: <span className="font-bold text-red-500">{notif.qty} {notif.unit || ""}</span> | Batas minimum: <span className="font-bold">{notif.min_stock} {notif.unit || ""}</span> | Kategori: <span className="uppercase">{notif.category || "-"}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
                        {t("notif.asset")}: <span className="font-bold">{notif.assetName}</span> | {t("notif.location")}: <span className="uppercase">{notif.locationName}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-[#94A3B8] mt-1 italic"><Clock size={12} className="inline mr-1"/> {new Date(notif.created_at).toLocaleString("id-ID")}</p>
                  </div>
                </div>
              </Link>
              
              <button 
                onClick={(e) => { e.preventDefault(); markAsRead(notif.id, notif.type); }}
                className="absolute top-5 right-5 p-2 text-[#94A3B8] hover:text-[#0D9488] hover:bg-teal-50 dark:hover:bg-[#0F172A] rounded-full transition-all"
                title="Tandai sudah dibaca"
              >
                <Check size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}