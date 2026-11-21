import React, { useMemo, useRef, useState } from 'react';
import { appAsset } from '../utils/assetPath';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Film,
  FolderPlus,
  Layers,
  Link2,
  LogOut,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Tv,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  ContentType,
  FamilyCollection,
  FamilyProfile,
  FamilySettings,
  MediaItem,
  ProfileState,
  SourceType,
} from '../types/media';
import {
  CATEGORIES,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_SINGULAR,
  extractYoutubeId,
  groupLibraryItems,
  normalizeArabicText,
  safeHttpsUrl,
} from '../utils/library';

interface AdminDashboardProps {
  items: MediaItem[];
  collections: FamilyCollection[];
  settings: FamilySettings;
  profileState: ProfileState;
  cloudUser: User | null;
  onSignInCloud: () => Promise<User | null>;
  onSignOutCloud: () => Promise<void>;
  onUpsertItem: (item: MediaItem) => void;
  onUpsertItemsBulk: (items: MediaItem[]) => void;
  onDeleteItem: (itemId: string) => void;
  onTogglePublish: (itemId: string) => void;
  onUpsertCollection: (col: FamilyCollection) => void;
  onDeleteCollection: (collectionId: string) => void;
  onUpdateSettings: (next: FamilySettings) => void;
  onResetSeed: () => void;
  onImportJson: (raw: string) => { ok: boolean; count: number; error?: string };
  onBackHome: () => void;
}

const ARTWORK_PRESETS = [
  {
    label: 'فانوس السهرة (سينما)',
    url: appAsset('src/assets/images/cinema_hero_family_night_1795216075836.jpg'),
  },
  {
    label: 'قوافل الصحراء (قصص)',
    url: appAsset('src/assets/images/poster_prophets_story_1795216075147.jpg'),
  },
  {
    label: 'بيت النهر (رسوم ومغامرات)',
    url: appAsset('src/assets/images/poster_family_adventure_1795216075432.jpg'),
  },
  {
    label: 'شفق الأرض (وثائقي)',
    url: appAsset('src/assets/images/poster_space_documentary_1795216074553.jpg'),
  },
  {
    label: 'إذاعة التراث (صوتيات)',
    url: appAsset('src/assets/images/poster_audio_heritage_1795216075429.jpg'),
  },
];

function createBlankDraft(): MediaItem {
  const now = Date.now();
  return {
    id: `item-${now}`,
    title: '',
    story: 'لمة البيت',
    contentType: 'movie',
    category: 'أفلام عائلية',
    seasonNumber: 1,
    episodeNumber: 1,
    durationSeconds: 1800,
    introStartSec: 0,
    introEndSec: 0,
    releaseYear: '2025',
    rating: 'عائلي',
    ageRating: 'all',
    ambientColor: '#f4ba48',
    featuredOrder: 99,
    description: '',
    storyText: '',
    sourceType: 'demo',
    posterUrl: ARTWORK_PRESETS[0].url,
    backdropUrl: ARTWORK_PRESETS[0].url,
    galleryUrls: [],
    published: true,
    featured: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  collections,
  settings,
  profileState,
  cloudUser,
  onSignInCloud,
  onSignOutCloud,
  onUpsertItem,
  onUpsertItemsBulk,
  onDeleteItem,
  onTogglePublish,
  onUpsertCollection,
  onDeleteCollection,
  onUpdateSettings,
  onResetSeed,
  onImportJson,
  onBackHome,
}) => {
  const [adminTab, setAdminTab] = useState<'library' | 'collections' | 'settings' | 'cloud'>('library');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all');
  const [groupedMode, setGroupedMode] = useState(false);
  const [editingDraft, setEditingDraft] = useState<MediaItem | null>(null);
  const [galleryText, setGalleryText] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSeries, setBulkSeries] = useState('');
  const [bulkSeason, setBulkSeason] = useState(1);
  const [bulkCategory, setBulkCategory] = useState<string>('قصص الأنبياء');
  const [bulkUrlsText, setBulkUrlsText] = useState('');

  const [editingCollection, setEditingCollection] = useState<FamilyCollection | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileIsKids, setNewProfileIsKids] = useState(false);
  const [newProfilePin, setNewProfilePin] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<FamilySettings>(settings);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [healthIssues, setHealthIssues] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const metrics = useMemo(() => {
    const publishedCount = items.filter((i) => i.published).length;
    const groupedSeries = groupLibraryItems(items.filter((i) => i.contentType === 'series')).length;
    const totalPlays = Object.values(profileState.playCounts).reduce((a, b) => a + b, 0);
    return {
      total: items.length,
      published: publishedCount,
      seriesCount: groupedSeries,
      plays: totalPlays,
    };
  }, [items, profileState.playCounts]);

  const filteredItems = useMemo(() => {
    const q = normalizeArabicText(query);
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.contentType !== typeFilter) return false;
      if (!q) return true;
      return normalizeArabicText(`${item.title} ${item.story} ${item.category}`).includes(q);
    });
  }, [items, query, typeFilter]);

  const groupedRows = useMemo(
    () => groupLibraryItems(filteredItems),
    [filteredItems]
  );

  const openEditor = (draft: MediaItem) => {
    setEditingDraft({ ...draft });
    setGalleryText((draft.galleryUrls || []).join('\n'));
  };

  const applyYoutubeAutoFill = () => {
    if (!editingDraft) return;
    const ytId = extractYoutubeId(editingDraft.youtubeUrl || editingDraft.videoUrl);
    if (!ytId) {
      setStatusMessage('الرجاء إدخال رابط يوتيوب صحيح أولاً للاستخراج التلقائي.');
      return;
    }
    const thumb = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    setEditingDraft({
      ...editingDraft,
      sourceType: 'youtube',
      youtubeUrl: editingDraft.youtubeUrl || editingDraft.videoUrl,
      posterUrl: thumb,
      backdropUrl: thumb,
      title: editingDraft.title.trim() || `فيديو يوتيوب (${ytId})`,
    });
    setStatusMessage('تم استخراج صورة الغلاف ومعرّف يوتيوب تلقائياً.');
  };

  const runHealthCheck = () => {
    const issues: string[] = [];
    for (const item of items) {
      if (item.sourceType === 'youtube' && !extractYoutubeId(item.youtubeUrl || item.videoUrl)) {
        issues.push(`${item.title}: رابط يوتيوب غير مكتمل`);
      }
      if (item.sourceType === 'url' && !safeHttpsUrl(item.videoUrl)) {
        issues.push(`${item.title}: رابط الفيديو المباشر غير صالح أو ليس HTTPS`);
      }
      if (item.sourceType === 'audio-url' && !safeHttpsUrl(item.audioUrl)) {
        issues.push(`${item.title}: رابط الصوت غير صالح أو ليس HTTPS`);
      }
      if (!item.posterUrl) {
        issues.push(`${item.title}: بدون صورة غلاف`);
      }
    }
    setHealthIssues(issues);
    setStatusMessage(
      issues.length === 0
        ? 'فحص الروابط سليم 100% — جميع المصادر والأغلفة صالحة.'
        : `تم اكتشاف ${issues.length} ملاحظة في الروابط.`
    );
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSeries.trim() || !bulkUrlsText.trim()) return;
    const lines = bulkUrlsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const now = Date.now();
    const created: MediaItem[] = lines.map((line, idx) => {
      const [maybeTitle, maybeUrl] = line.includes('|')
        ? line.split('|').map((s) => s.trim())
        : [`الحلقة ${idx + 1}`, line];
      const ytId = extractYoutubeId(maybeUrl);
      return {
        id: `bulk-${now}-${idx}`,
        title: maybeTitle || `الحلقة ${idx + 1}`,
        story: bulkSeries.trim(),
        contentType: 'series',
        category: bulkCategory,
        seasonNumber: bulkSeason,
        episodeNumber: idx + 1,
        durationSeconds: 1500,
        releaseYear: String(new Date().getFullYear()),
        rating: 'عائلي',
        ageRating: 'all',
        ambientColor: '#f4ba48',
        description: `${bulkSeries.trim()} — الموسم ${bulkSeason}، ${maybeTitle || `الحلقة ${idx + 1}`}.`,
        sourceType: ytId ? 'youtube' : safeHttpsUrl(maybeUrl) ? 'url' : 'demo',
        youtubeUrl: ytId ? maybeUrl : undefined,
        videoUrl: !ytId && safeHttpsUrl(maybeUrl) ? maybeUrl : undefined,
        posterUrl: ytId
          ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
          : ARTWORK_PRESETS[1].url,
        backdropUrl: ytId
          ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
          : ARTWORK_PRESETS[1].url,
        published: true,
        featured: false,
        createdAt: now + idx,
        updatedAt: now + idx,
      };
    });

    onUpsertItemsBulk(created);
    setStatusMessage(`تم إنشاء وإضافة ${created.length} حلقة دفعة واحدة لمسلسل "${bulkSeries.trim()}".`);
    setBulkOpen(false);
    setBulkUrlsText('');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lammet-elbeit-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('تم تصدير نسخة احتياطية كاملة بصيغة JSON.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = onImportJson(text);
    setStatusMessage(
      res.ok ? `تم استيراد ${res.count} عمل بنجاح.` : res.error || 'تعذر قراءة الملف.'
    );
    e.target.value = '';
  };

  const saveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft || !editingDraft.title.trim()) return;
    const galleryUrls = galleryText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter((s) => Boolean(safeHttpsUrl(s)));

    onUpsertItem({
      ...editingDraft,
      title: editingDraft.title.trim(),
      story: editingDraft.story.trim() || 'لمة البيت',
      backdropUrl: editingDraft.backdropUrl || editingDraft.posterUrl,
      galleryUrls,
      updatedAt: Date.now(),
    });
    setStatusMessage(`تم حفظ "${editingDraft.title.trim()}" في المكتبة.`);
    setEditingDraft(null);
  };

  const saveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editingCollection.title.trim()) return;
    onUpsertCollection({
      ...editingCollection,
      title: editingCollection.title.trim(),
      subtitle: editingCollection.subtitle.trim(),
      updatedAt: Date.now(),
    });
    setStatusMessage(`تم حفظ الباقة "${editingCollection.title.trim()}".`);
    setEditingCollection(null);
  };

  const addCustomProfile = () => {
    if (!newProfileName.trim()) return;
    const palette = ['#f4ba48', '#34d399', '#4f8bff', '#f472b6', '#a78bfa'];
    const prof: FamilyProfile = {
      id: `member-${Date.now()}`,
      name: newProfileName.trim(),
      subtitle: newProfileIsKids ? 'ملف طفل آمن مع مؤقت' : 'ملف عضو عائلي مخصص',
      badgeLetter: newProfileName.trim().slice(0, 1),
      accent: palette[settingsDraft.customProfiles.length % palette.length],
      isKids: newProfileIsKids,
      requiresPin: newProfilePin,
    };
    const next = {
      ...settingsDraft,
      customProfiles: [...settingsDraft.customProfiles, prof],
    };
    setSettingsDraft(next);
    onUpdateSettings(next);
    setNewProfileName('');
    setNewProfileIsKids(false);
    setNewProfilePin(false);
    setStatusMessage(`تم إضافة ملف "${prof.name}".`);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col gap-6 px-4 pb-24 pt-6 sm:px-6 lg:flex-row lg:px-8 lg:pb-12">
      {/* Desktop Sidebar */}
      <aside
        className="w-full shrink-0 space-y-5 rounded-2xl border p-5 lg:w-64 lg:self-start"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-center justify-between lg:block">
          <div>
            <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
              مركز الإدارة المستقل
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              بوابة /admin المحمية للمشرفين
            </p>
          </div>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold lg:mt-4 lg:w-full lg:justify-center"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>العودة لواجهة العرض</span>
          </button>
        </div>

        {/* Section Tabs */}
        <nav className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
          {[
            { id: 'library' as const, label: 'المكتبة والحلقات', icon: Film },
            { id: 'collections' as const, label: 'الباقات والمجموعات', icon: FolderPlus },
            { id: 'settings' as const, label: 'الأعضاء والرقابة', icon: Users },
            { id: 'cloud' as const, label: 'السحابة والتلفاز', icon: Cloud },
          ].map((t) => {
            const Icon = t.icon;
            const active = adminTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdminTab(t.id)}
                className="flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-colors"
                style={{
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--accent-primary) 16%, transparent)'
                    : 'var(--bg-elevated)',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="grid grid-cols-2 gap-2 border-t pt-4 lg:grid-cols-1" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => openEditor(createBlankDraft())}
            className="btn-royal flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-extrabold"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة عمل جديد</span>
          </button>

          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            <Layers className="h-4 w-4" />
            <span>استيراد موسم حلقات</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            <Download className="h-4 w-4" />
            <span>تصدير JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            <Upload className="h-4 w-4" />
            <span>استيراد JSON</span>
          </button>

          <button
            type="button"
            onClick={runHealthCheck}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>فحص سلامة الروابط</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetSeed();
              setStatusMessage('تمت استعادة مكتبة البداية الافتراضية.');
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 space-y-6">
        {statusMessage && (
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold"
            style={{
              borderColor: 'var(--accent-primary)',
              backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface))',
              color: 'var(--text-primary)',
            }}
          >
            <span>{statusMessage}</span>
            <button type="button" onClick={() => setStatusMessage(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {healthIssues.length > 0 && (
          <div
            className="space-y-1.5 rounded-xl border p-4 text-xs"
            style={{
              borderColor: 'var(--accent-danger)',
              backgroundColor: 'color-mix(in srgb, var(--accent-danger) 10%, var(--bg-surface))',
              color: 'var(--text-primary)',
            }}
          >
            <p className="font-extrabold">تقرير فحص الروابط ({healthIssues.length}):</p>
            <ul className="list-inside list-disc space-y-1">
              {healthIssues.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* KPI Cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'إجمالي الأعمال', value: metrics.total },
            { label: 'منشور حالياً', value: metrics.published },
            { label: 'سلاسل المسلسلات', value: metrics.seriesCount },
            { label: 'مرات التشغيل', value: metrics.plays },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border p-4"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {kpi.label}
              </p>
              <p
                className="mt-1 text-2xl font-black tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </section>

        {adminTab === 'library' && (
          <>
            {/* Toolbar */}
            <section
              className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div
                className="flex flex-1 items-center gap-2 rounded-xl border px-3"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث داخل الإدارة بالعنوان أو التصنيف..."
                  className="h-10 w-full bg-transparent text-xs font-semibold outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="تصفية النوع"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | ContentType)}
                  className="h-10 rounded-xl border px-3 text-xs font-bold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">كل الأنواع</option>
                  {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((key) => (
                    <option key={key} value={key}>
                      {CONTENT_TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setGroupedMode((g) => !g)}
                  className="flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold"
                  style={{
                    borderColor: groupedMode ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: groupedMode
                      ? 'color-mix(in srgb, var(--accent-primary) 15%, var(--bg-elevated))'
                      : 'var(--bg-elevated)',
                    color: groupedMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <Layers className="h-4 w-4" />
                  <span>تجميع المسلسلات</span>
                </button>
              </div>
            </section>

            {/* Desktop Table */}
            <section
              className="hidden overflow-hidden rounded-2xl border md:block"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <table className="w-full text-right text-sm">
                <thead>
                  <tr
                    className="border-b text-xs font-bold"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  >
                    <th className="px-4 py-3">العمل</th>
                    <th className="px-4 py-3">النوع</th>
                    <th className="px-4 py-3">التصنيف</th>
                    <th className="px-4 py-3">الفئة العمرية</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {groupedMode
                    ? groupedRows.map((group) => {
                        const rep = group.representative;
                        return (
                          <tr key={group.key} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={group.posterUrl || ARTWORK_PRESETS[0].url}
                                  alt=""
                                  className="h-11 w-14 rounded-lg object-cover"
                                />
                                <div>
                                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {group.displayTitle}
                                  </p>
                                  <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                    {group.isSeriesGroup
                                      ? `${group.seasonsCount} موسم · ${group.episodesCount} حلقة`
                                      : rep.story}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              {CONTENT_TYPE_SINGULAR[rep.contentType]}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {rep.category}
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {rep.ageRating === 'kids' ? 'أطفال' : rep.ageRating === 'adults' ? 'كبار' : 'الجميع'}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold">
                              <span style={{ color: rep.published ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                                {rep.published ? 'منشور' : 'مسودة'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-left">
                              <button
                                type="button"
                                onClick={() => openEditor(rep)}
                                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>تعديل</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    : filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.posterUrl || ARTWORK_PRESETS[0].url}
                                alt=""
                                className="h-11 w-14 rounded-lg object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-bold" style={{ color: 'var(--text-primary)' }}>
                                  {item.title}
                                </p>
                                <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {item.story}
                                  {item.contentType === 'series'
                                    ? ` · م${item.seasonNumber || 1} ح${item.episodeNumber || 1}`
                                    : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            {CONTENT_TYPE_SINGULAR[item.contentType]}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {item.category}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {item.ageRating === 'kids' ? 'أطفال' : item.ageRating === 'adults' ? 'كبار' : 'الجميع'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => onTogglePublish(item.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold"
                              style={{
                                color: item.published ? 'var(--accent-success)' : 'var(--text-muted)',
                              }}
                            >
                              {item.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              <span>{item.published ? 'منشور' : 'مخفي'}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                aria-label={`تعديل ${item.title}`}
                                onClick={() => openEditor(item)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border"
                                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              {deleteConfirmId === item.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteItem(item.id);
                                    setDeleteConfirmId(null);
                                    setStatusMessage(`تم حذف "${item.title}".`);
                                  }}
                                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white"
                                >
                                  تأكيد الحذف
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`حذف ${item.title}`}
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-red-400"
                                  style={{ borderColor: 'var(--border-subtle)' }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </section>

            {/* Mobile Cards Layout (<768px) */}
            <section className="grid gap-3 md:hidden">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border p-3"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <img
                    src={item.posterUrl || ARTWORK_PRESETS[0].url}
                    alt=""
                    className="h-16 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {CONTENT_TYPE_SINGULAR[item.contentType]} · {item.category} ·{' '}
                      {item.published ? 'منشور' : 'مسودة'}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditor(item)}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePublish(item.id)}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                      >
                        {item.published ? 'إخفاء' : 'نشر'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteItem(item.id);
                          setStatusMessage(`تم حذف "${item.title}".`);
                        }}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-bold text-red-400"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {/* Collections / Playlists Tab */}
        {adminTab === 'collections' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  باقات وسهرات العيلة المنسقة
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  أنشئ قوائم مجمعة (مثل: سهرات رمضان، حكايات قبل النوم) لتظهر كصفوف مميزة في الرئيسية
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingCollection({
                    id: `col-${Date.now()}`,
                    title: '',
                    subtitle: '',
                    itemIds: [],
                    order: collections.length + 1,
                    published: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  })
                }
                className="btn-royal flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-extrabold"
              >
                <Plus className="h-4 w-4" />
                <span>باقة جديدة</span>
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="space-y-2 rounded-2xl border p-4"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        {col.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {col.subtitle || 'باقة مخصصة'} · {col.itemIds.length} عمل
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingCollection({ ...col })}
                        className="rounded-lg border px-2.5 py-1 text-xs font-bold"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCollection(col.id);
                          setStatusMessage(`تم حذف باقة "${col.title}".`);
                        }}
                        className="rounded-lg border px-2.5 py-1 text-xs font-bold text-red-400"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Settings, PIN & Profiles Tab */}
        {adminTab === 'settings' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div
              className="space-y-4 rounded-2xl border p-5"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  الأمان ووقت شاشة الأطفال
                </h2>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  رمز PIN لدخول الإدارة وملف الكبار
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={settingsDraft.adminPin}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      adminPin: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  className="h-10 w-full rounded-xl border px-3 text-sm font-black tracking-widest tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  الحد اليومي لمشاهدة ملف الأطفال (بالدقائق — 0 لإيقاف القيد)
                </label>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={settingsDraft.kidsDailyLimitMinutes}
                  onChange={(e) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      kidsDailyLimitMinutes: Number(e.target.value || 0),
                    })
                  }
                  className="h-10 w-full rounded-xl border px-3 text-sm font-bold tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const cleanPin = settingsDraft.adminPin.trim() || '2025';
                  const next = { ...settingsDraft, adminPin: cleanPin };
                  setSettingsDraft(next);
                  onUpdateSettings(next);
                  setStatusMessage('تم حفظ إعدادات الأمان والرقابة بنجاح.');
                }}
                className="btn-royal h-10 rounded-xl px-5 text-xs font-extrabold"
              >
                حفظ الإعدادات
              </button>
            </div>

            <div
              className="space-y-4 rounded-2xl border p-5"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  ملفات أفراد العائلة ({settingsDraft.customProfiles.length})
                </h2>
              </div>

              <div className="space-y-2">
                {settingsDraft.customProfiles.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex items-center justify-between rounded-xl border px-3 py-2.5"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-slate-950"
                        style={{ backgroundColor: prof.accent }}
                      >
                        {prof.badgeLetter}
                      </span>
                      <div>
                        <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>
                          {prof.name}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {prof.isKids ? 'وضع أطفال' : 'وضع كامل'}
                          {prof.requiresPin ? ' · محمي برمز' : ''}
                        </p>
                      </div>
                    </div>
                    {!['family', 'kids', 'adults'].includes(prof.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = {
                            ...settingsDraft,
                            customProfiles: settingsDraft.customProfiles.filter((p) => p.id !== prof.id),
                          };
                          setSettingsDraft(next);
                          onUpdateSettings(next);
                        }}
                        className="text-xs font-bold text-red-400"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  إضافة ملف عضو جديد
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="اسم العضو (مثلاً: أحمد، سارة)"
                    className="h-9 flex-1 rounded-xl border px-3 text-xs font-semibold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomProfile}
                    className="btn-royal h-9 rounded-xl px-4 text-xs font-extrabold"
                  >
                    إضافة
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-1.5 font-semibold">
                    <input
                      type="checkbox"
                      checked={newProfileIsKids}
                      onChange={(e) => setNewProfileIsKids(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>تقييد كمحتوى أطفال</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-semibold">
                    <input
                      type="checkbox"
                      checked={newProfilePin}
                      onChange={(e) => setNewProfilePin(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>طلب رمز PIN عند الدخول</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cloud Sync & Samsung Smart TV Packaging Tab */}
        {adminTab === 'cloud' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div
              className="space-y-4 rounded-2xl border p-5"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  المزامنة السحابية بين الأجهزة (Firebase)
                </h2>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                سجّل الدخول بحساب المشرف لمزامنة المكتبة والباقات ودفتر العيلة وجلسات التلفاز فورياً عبر شبكة الإنترنت بين الهاتف وشاشة سامسونج.
              </p>

              {cloudUser ? (
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
                      color: 'var(--accent-success)',
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>متصل بالسحابة: {cloudUser.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOutCloud}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-xs font-bold"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>تسجيل الخروج من السحابة</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignInCloud}
                  className="btn-royal inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-extrabold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>ربط ومزامنة مع حساب Google</span>
                </button>
              )}
            </div>

            <div
              className="space-y-3 rounded-2xl border p-5"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex items-center gap-2">
                <Tv className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  حزمة تلفاز سامسونج (Samsung Tizen TV)
                </h2>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                ملف الإعداد <span dir="ltr" className="font-bold">/public/tizen/config.xml</span> جاهز مع أذونات الريموت والشبكة، ودعم مفاتيح Tizen (<span dir="ltr">Return, Play, Pause, FF, RW</span>) وإخفاء سهم الماوس تلقائياً في وضع التلفاز.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                للتجربة الفورية على متصفح التلفاز بدون حزمة: افتح{' '}
                <span dir="ltr" className="font-bold">{window.location.origin}/?tv=1</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={appAsset('downloads/lammet-elbeit-samsung-tv.zip')}
                  download="lammet-elbeit-samsung-tv.zip"
                  className="btn-royal inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل حزمة التلفاز كاملة (ZIP)</span>
                </a>
                <a
                  href={appAsset('downloads/lammet-elbeit-source.zip')}
                  download="lammet-elbeit-source.zip"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-extrabold"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل كود المشروع كاملاً (ZIP)</span>
                </a>
                <a
                  href={appAsset('tizen/config.xml')}
                  download="config.xml"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-extrabold"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل ملف config.xml</span>
                </a>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bulk Season Importer Modal */}
      {bulkOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="استيراد موسم حلقات دفعة واحدة"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setBulkOpen(false)}
        >
          <form
            onSubmit={handleBulkImport}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg space-y-4 rounded-2xl border p-6 shadow-2xl"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                إضافة موسم كامل دفعة واحدة
              </h2>
              <button type="button" onClick={() => setBulkOpen(false)}>
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  اسم المسلسل *
                </label>
                <input
                  required
                  type="text"
                  value={bulkSeries}
                  onChange={(e) => setBulkSeries(e.target.value)}
                  placeholder="مثال: قوافل اليقين"
                  className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  رقم الموسم
                </label>
                <input
                  type="number"
                  min={1}
                  value={bulkSeason}
                  onChange={(e) => setBulkSeason(Number(e.target.value || 1))}
                  className="h-10 w-full rounded-xl border px-3 text-xs font-bold tabular-nums outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                التصنيف
              </label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                الحلقات (سطر لكل حلقة: العنوان | الرابط، أو الرابط فقط)
              </label>
              <textarea
                required
                rows={5}
                value={bulkUrlsText}
                onChange={(e) => setBulkUrlsText(e.target.value)}
                placeholder={'الحلقة الأولى: البداية | https://youtu.be/...\nالحلقة الثانية: العهد | https://youtu.be/...'}
                className="w-full rounded-xl border p-3 text-xs font-semibold outline-none"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="rounded-xl border px-4 py-2 text-xs font-bold"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-royal rounded-xl px-5 py-2 text-xs font-extrabold">
                توليد وحفظ الحلقات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collection Editor Modal */}
      {editingCollection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="إضافة أو تعديل باقة"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setEditingCollection(null)}
        >
          <form
            onSubmit={saveCollection}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                بيانات الباقة العائلية
              </h2>
              <button type="button" onClick={() => setEditingCollection(null)}>
                <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <input
              required
              type="text"
              value={editingCollection.title}
              onChange={(e) =>
                setEditingCollection({ ...editingCollection, title: e.target.value })
              }
              placeholder="اسم الباقة (مثال: سهرات نهاية الأسبوع)"
              className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />

            <input
              type="text"
              value={editingCollection.subtitle}
              onChange={(e) =>
                setEditingCollection({ ...editingCollection, subtitle: e.target.value })
              }
              placeholder="وصف قصير للباقة..."
              className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            />

            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border p-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                اختر الأعمال داخل الباقة:
              </p>
              {items.map((item) => {
                const checked = editingCollection.itemIds.includes(item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextIds = e.target.checked
                          ? [...editingCollection.itemIds, item.id]
                          : editingCollection.itemIds.filter((x) => x !== item.id);
                        setEditingCollection({ ...editingCollection, itemIds: nextIds });
                      }}
                      className="accent-amber-400"
                    />
                    <span className="truncate">{item.title}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCollection(null)}
                className="rounded-xl border px-4 py-2 text-xs font-bold"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-royal rounded-xl px-5 py-2 text-xs font-extrabold">
                حفظ الباقة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Item Modal with Live Card Preview + Smart Auto-Fill */}
      {editingDraft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="إضافة أو تعديل عمل"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() => setEditingDraft(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="grid max-h-[90vh] w-full max-w-4xl gap-6 overflow-y-auto rounded-2xl border p-6 shadow-2xl lg:grid-cols-[1fr_260px]"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <form onSubmit={saveDraft} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Film className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                  <h2 className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    بيانات العمل في المكتبة
                  </h2>
                </div>
                <button type="button" aria-label="إغلاق" onClick={() => setEditingDraft(null)}>
                  <X className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    عنوان العمل *
                  </label>
                  <input
                    required
                    type="text"
                    value={editingDraft.title}
                    onChange={(e) => setEditingDraft({ ...editingDraft, title: e.target.value })}
                    placeholder="مثال: رحلة الفانوس المضيء"
                    className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    اسم السلسلة / المجموعة
                  </label>
                  <input
                    type="text"
                    value={editingDraft.story}
                    onChange={(e) => setEditingDraft({ ...editingDraft, story: e.target.value })}
                    placeholder="مثال: قوافل اليقين"
                    className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    نوع المحتوى
                  </label>
                  <select
                    value={editingDraft.contentType}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        contentType: e.target.value as ContentType,
                      })
                    }
                    className="h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((key) => (
                      <option key={key} value={key}>
                        {CONTENT_TYPE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    التصنيف
                  </label>
                  <select
                    value={editingDraft.category}
                    onChange={(e) => setEditingDraft({ ...editingDraft, category: e.target.value })}
                    className="h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    مصدر التشغيل
                  </label>
                  <select
                    value={editingDraft.sourceType}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, sourceType: e.target.value as SourceType })
                    }
                    className="h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="demo">عرض سينمائي مدمج (Demo)</option>
                    <option value="url">رابط فيديو مباشر HTTPS</option>
                    <option value="youtube">رابط يوتيوب</option>
                    <option value="reading">نص مقروء (قصة/ذكرى)</option>
                    <option value="audio-url">رابط صوتي مباشر HTTPS</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    الفئة العمرية
                  </label>
                  <select
                    value={editingDraft.ageRating || 'all'}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        ageRating: e.target.value as 'all' | 'kids' | 'adults',
                      })
                    }
                    className="h-10 w-full rounded-xl border px-3 text-xs font-bold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="all">للجميع (العائلة)</option>
                    <option value="kids">مناسب للأطفال</option>
                    <option value="adults">للكبار فقط</option>
                  </select>
                </div>
              </div>

              {editingDraft.sourceType === 'youtube' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    رابط يوتيوب + سحب الغلاف الذكي
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editingDraft.youtubeUrl || ''}
                      onChange={(e) => setEditingDraft({ ...editingDraft, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="h-10 flex-1 rounded-xl border px-3 text-xs font-semibold outline-none"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={applyYoutubeAutoFill}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold"
                      style={{
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>سحب الغلاف</span>
                    </button>
                  </div>
                </div>
              )}

              {(editingDraft.sourceType === 'url' || editingDraft.sourceType === 'audio-url') && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      رابط الوسائط الأساسي (HTTPS)
                    </label>
                    <input
                      type="url"
                      value={
                        editingDraft.sourceType === 'audio-url'
                          ? editingDraft.audioUrl || ''
                          : editingDraft.videoUrl || ''
                      }
                      onChange={(e) =>
                        setEditingDraft(
                          editingDraft.sourceType === 'audio-url'
                            ? { ...editingDraft, audioUrl: e.target.value }
                            : { ...editingDraft, videoUrl: e.target.value }
                        )
                      }
                      placeholder="https://..."
                      className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  {editingDraft.sourceType === 'url' && (
                    <div>
                      <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                        رابط احتياطي (Mirror Fallback)
                      </label>
                      <input
                        type="url"
                        value={editingDraft.backupVideoUrl || ''}
                        onChange={(e) =>
                          setEditingDraft({ ...editingDraft, backupVideoUrl: e.target.value })
                        }
                        placeholder="https://..."
                        className="h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Skip Intro Timing & Hero Order */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                    بداية المقدمة (ث)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingDraft.introStartSec || 0}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, introStartSec: Number(e.target.value || 0) })
                    }
                    className="h-9 w-full rounded-xl border px-2.5 text-xs font-bold tabular-nums outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                    نهاية المقدمة (ث)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingDraft.introEndSec || 0}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, introEndSec: Number(e.target.value || 0) })
                    }
                    className="h-9 w-full rounded-xl border px-2.5 text-xs font-bold tabular-nums outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                    ترتيب الهيرو
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingDraft.featuredOrder ?? 99}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        featuredOrder: Number(e.target.value || 99),
                      })
                    }
                    className="h-9 w-full rounded-xl border px-2.5 text-xs font-bold tabular-nums outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  غلاف العمل (اختر تصميماً أو أدخل رابطاً)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ARTWORK_PRESETS.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() =>
                        setEditingDraft({
                          ...editingDraft,
                          posterUrl: preset.url,
                          backdropUrl: preset.url,
                        })
                      }
                      className="rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                      style={{
                        borderColor:
                          editingDraft.posterUrl === preset.url
                            ? 'var(--accent-primary)'
                            : 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {editingDraft.contentType === 'memory' && (
                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    روابط صور الألبوم (رابط HTTPS لكل سطر)
                  </label>
                  <textarea
                    rows={2}
                    value={galleryText}
                    onChange={(e) => setGalleryText(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border p-2.5 text-xs font-semibold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  الوصف المختصر
                </label>
                <textarea
                  rows={2}
                  value={editingDraft.description}
                  onChange={(e) => setEditingDraft({ ...editingDraft, description: e.target.value })}
                  placeholder="نبذة موجزة تظهر في واجهة التفاصيل والهيرو..."
                  className="w-full rounded-xl border p-3 text-xs font-semibold outline-none"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {editingDraft.sourceType === 'reading' && (
                <div>
                  <label className="mb-1 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    نص الحكاية أو الذكرى الكامل
                  </label>
                  <textarea
                    rows={4}
                    value={editingDraft.storyText || ''}
                    onChange={(e) => setEditingDraft({ ...editingDraft, storyText: e.target.value })}
                    placeholder="اكتب نص الحكاية هنا..."
                    className="w-full rounded-xl border p-3 text-xs font-semibold outline-none"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={editingDraft.published}
                      onChange={(e) => setEditingDraft({ ...editingDraft, published: e.target.checked })}
                      className="h-4 w-4 accent-amber-400"
                    />
                    <span>نشر في المكتبة</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingDraft.featured)}
                      onChange={(e) => setEditingDraft({ ...editingDraft, featured: e.target.checked })}
                      className="h-4 w-4 accent-amber-400"
                    />
                    <span>تثبيت في الواجهة (Hero)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDraft(null)}
                    className="rounded-xl border px-4 py-2 text-xs font-bold"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    إلغاء
                  </button>
                  <button type="submit" className="btn-royal rounded-xl px-5 py-2 text-xs font-extrabold">
                    حفظ العمل
                  </button>
                </div>
              </div>
            </form>

            {/* Real-Time Live Card Preview */}
            <aside className="space-y-3 border-t pt-4 lg:border-r lg:border-t-0 lg:pr-5 lg:pt-0" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-xs font-extrabold" style={{ color: 'var(--accent-primary)' }}>
                معاينة حية للبطاقة
              </p>
              <div
                className="overflow-hidden rounded-xl border"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <img
                  src={editingDraft.posterUrl || ARTWORK_PRESETS[0].url}
                  alt="معاينة الغلاف"
                  className="aspect-[2/3] w-full object-cover"
                />
              </div>
              <div>
                <h3 className="truncate text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {editingDraft.title.trim() || 'عنوان العمل الجديد'}
                </h3>
                <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                  {CONTENT_TYPE_SINGULAR[editingDraft.contentType]} · {editingDraft.category} ·{' '}
                  {editingDraft.releaseYear || '2025'}
                </p>
                {editingDraft.description && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {editingDraft.description}
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
