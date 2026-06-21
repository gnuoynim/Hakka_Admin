import { useEffect, useMemo, useState } from "react";
import {
  Card, Title, Text, Metric, Grid, BarChart, BarList, AreaChart, DonutChart,
  Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell,
  Badge, Select, SelectItem,
} from "@tremor/react";
import { getStats, getPopularLinks, getRawSearch, getRawShare, getRawActions } from "../lib/api";
import type { Period } from "../lib/api";
import { useAuth } from "../lib/auth";
import MokkojiModal from "../components/MokkojiModal";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "90d", label: "최근 90일" },
  { value: "1y", label: "최근 1년" },
];
const AGE_RANGES = ["10s", "20s", "30s", "40s", "50+"];
const CATEGORIES = ["place", "shopping", "sns", "video"];

export default function Dashboard() {
  const { email, signOut } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [stats, setStats] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터
  const [fAge, setFAge] = useState<string>("");
  const [fCat, setFCat] = useState<string>("");
  const [fTag, setFTag] = useState<string>("");
  const [openMokkojiId, setOpenMokkojiId] = useState<number | null>(null);

  // 정렬: 첫 클릭 = 내림차순(▼), 같은 컬럼 다시 클릭 = 오름차순(▲) 토글
  type SortKey = "view_events" | "click_events" | "unique_users" | "avg_per_user";
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (sortBy !== key) { setSortBy(key); setSortDir("desc"); return; }
    setSortDir(sortDir === "desc" ? "asc" : "desc");
  };

  const [searchData, setSearchData] = useState<any>(null);
  const [shareData, setShareData] = useState<any>(null);
  const [actionsData, setActionsData] = useState<any>(null);

  useEffect(() => {
    getRawSearch(period).then(setSearchData).catch(() => setSearchData(null));
    getRawShare(period).then(setShareData).catch(() => setShareData(null));
    getRawActions(period).then(setActionsData).catch(() => setActionsData(null));
  }, [period]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getStats(period),
      getPopularLinks({
        period,
        age_range: fAge || undefined,
        category: fCat || undefined,
        tag: fTag || undefined,
      }),
    ])
      .then(([s, l]) => {
        setStats(s);
        setLinks(l.links);
      })
      .finally(() => setLoading(false));
  }, [period, fAge, fCat, fTag]);

  const sortedLinks = useMemo(() => {
    if (!sortBy) return links;
    const dir = sortDir === "desc" ? -1 : 1;
    return [...links].sort((a, b) => ((Number(a[sortBy]) || 0) - (Number(b[sortBy]) || 0)) * dir);
  }, [links, sortBy, sortDir]);

  const tagBarData = useMemo(
    () => (stats?.top_tags || []).map((t: any) => ({ name: t.tag, value: t.count })),
    [stats]
  );
  const revisitData = useMemo(
    () => (stats?.category_revisit_rate || []).map((r: any) => ({
      카테고리: r.category,
      "재방문률(%)": r.revisit_rate,
      "유저당 평균": r.avg_per_user,
    })),
    [stats]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Title>Hakka Admin</Title>
          <div className="flex-1" />
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)} className="max-w-[140px]">
            {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </Select>
          <Text>{email}</Text>
          <button onClick={signOut} className="text-sm text-blue-600 hover:underline">로그아웃</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {/* 운영 현황 */}
        <Grid numItemsMd={4} className="gap-4">
          <KpiCard title="DAU" value={stats?.kpis?.dau} loading={loading} />
          <KpiCard title="총 가입자" value={stats?.kpis?.total_users} loading={loading} />
          <KpiCard title="총 모꼬지" value={stats?.kpis?.total_mokkojis} loading={loading} />
          <KpiCard title="총 링크" value={stats?.kpis?.total_links} loading={loading} />
        </Grid>


        {/* 인기 링크 */}
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <Title>🔥 인기 링크 (재방문 기준)</Title>
            <div className="flex gap-2 flex-wrap">
              <Select value={fAge} onValueChange={setFAge} placeholder="연령대" className="min-w-[120px]">
                <SelectItem value="">전체 연령</SelectItem>
                {AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </Select>
              <Select value={fCat} onValueChange={setFCat} placeholder="카테고리" className="min-w-[120px]">
                <SelectItem value="">전체 카테고리</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </Select>
              <input
                value={fTag}
                onChange={(e) => setFTag(e.target.value)}
                placeholder="태그 (예: 쿠팡)"
                className="px-3 py-1 border rounded text-sm min-w-[140px]"
              />
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto border-t">
          <Table>
            <TableHead className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>제목</TableHeaderCell>
                <TableHeaderCell>도메인</TableHeaderCell>
                <TableHeaderCell>모꼬지</TableHeaderCell>
                <TableHeaderCell>카테고리</TableHeaderCell>
                <SortableHeader label="조회수" sortKey="view_events" current={sortBy} dir={sortDir} onClick={handleSort} />
                <SortableHeader label="클릭수" sortKey="click_events" current={sortBy} dir={sortDir} onClick={handleSort} />
                <SortableHeader label="고유 사용자" sortKey="unique_users" current={sortBy} dir={sortDir} onClick={handleSort} />
                <SortableHeader label="유저당 평균" sortKey="avg_per_user" current={sortBy} dir={sortDir} onClick={handleSort} />
                <TableHeaderCell className="text-right">재방문률</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedLinks.length === 0 && (
                <TableRow><TableCell colSpan={10}><Text className="text-center py-4">{loading ? "불러오는 중..." : "데이터 없음"}</Text></TableCell></TableRow>
              )}
              {sortedLinks.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="max-w-xs truncate">{l.title || l.url}</TableCell>
                  <TableCell>{l.domain}</TableCell>
                  <TableCell>
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => setOpenMokkojiId(l.mokkoji_id)}
                    >{l.mokkoji_name}</button>
                  </TableCell>
                  <TableCell>{l.category && <Badge>{l.category}</Badge>}</TableCell>
                  <TableCell className="text-right">{l.view_events}</TableCell>
                  <TableCell className="text-right">{l.click_events}</TableCell>
                  <TableCell className="text-right">{l.unique_users}</TableCell>
                  <TableCell className="text-right font-semibold">{l.avg_per_user}회</TableCell>
                  <TableCell className="text-right">{l.revisit_rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>

        {/* 차트 그리드 */}
        <Grid numItemsMd={2} className="gap-4">
          <Card>
            <Title>📈 카테고리별 재방문률</Title>
            <Text className="mt-1">카테고리 안에서 같은 사용자가 2회 이상 본 비율</Text>
            {revisitData.length > 0 ? (
              <BarChart
                className="mt-4 h-60"
                data={revisitData}
                index="카테고리"
                categories={["재방문률(%)"]}
                colors={["indigo"]}
                valueFormatter={(v) => `${v}%`}
              />
            ) : (
              <Text className="mt-6 text-center text-gray-400">데이터 없음</Text>
            )}
            {/* 수치 보조표 */}
            {revisitData.length > 0 && (
              <Table className="mt-3">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>카테고리</TableHeaderCell>
                    <TableHeaderCell className="text-right">고유 사용자</TableHeaderCell>
                    <TableHeaderCell className="text-right">재방문 사용자</TableHeaderCell>
                    <TableHeaderCell className="text-right">유저당 평균</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(stats?.category_revisit_rate || []).map((r: any) => (
                    <TableRow key={r.category}>
                      <TableCell><Badge>{r.category}</Badge></TableCell>
                      <TableCell className="text-right">{r.unique_users}</TableCell>
                      <TableCell className="text-right">{r.revisitors}</TableCell>
                      <TableCell className="text-right">{r.avg_per_user}회</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
          <Card>
            <Title>🏷 인기 태그 TOP 20</Title>
            <BarList
              data={tagBarData.map((d: any) => ({ ...d, color: "violet" }))}
              className="mt-4"
            />
          </Card>
        </Grid>

        {/* 검색어 TOP 10 + 활동 분포 (2-col) */}
        <Grid numItemsMd={2} className="gap-4">
          {searchData && <SearchActivityCard data={searchData} />}
          {actionsData && <ActionDistributionCard data={actionsData} />}
        </Grid>

        {/* 초대 → 가입 raw */}
        {shareData && <InviteJoinCard data={shareData} />}
      </main>

      {openMokkojiId !== null && (
        <MokkojiModal mokkojiId={openMokkojiId} period={period} onClose={() => setOpenMokkojiId(null)} />
      )}
    </div>
  );
}

function KpiCard({ title, value, loading }: { title: string; value: any; loading: boolean }) {
  return (
    <Card>
      <Text>{title}</Text>
      <Metric>{loading ? "..." : (value ?? 0).toLocaleString()}</Metric>
    </Card>
  );
}

function SortableHeader<K extends string>({
  label, sortKey, current, dir, onClick,
}: {
  label: string;
  sortKey: K;
  current: K | null;
  dir: "asc" | "desc";
  onClick: (k: K) => void;
}) {
  const active = current === sortKey;
  // 기본(비활성)은 내림차순 ▼을 회색으로, 활성 시 방향에 맞는 화살표를 파란색으로 강조
  const arrow = active ? (dir === "desc" ? "▼" : "▲") : "▼";
  return (
    <TableHeaderCell
      className={`text-right cursor-pointer select-none hover:bg-gray-50 ${active ? "text-blue-700" : ""}`}
      onClick={() => onClick(sortKey)}
    >
      {label}
      <span className={`text-xs ml-1 ${active ? "text-blue-700" : "text-gray-300"}`}>{arrow}</span>
    </TableHeaderCell>
  );
}

const ACTION_LABEL: Record<string, string> = {
  link_added: "링크 추가",
  link_viewed: "링크 조회",
  link_clicked: "링크 클릭",
  link_updated: "링크 수정",
  link_deleted: "링크 삭제",
  member_joined: "멤버 가입",
  member_left: "멤버 탈퇴",
  member_kicked: "멤버 강퇴",
  ownership_transferred: "소유권 이전",
};

function ActionDistributionCard({ data }: { data: any }) {
  const { actions } = data;
  return (
    <Card>
      <Title>📊 활동 분포</Title>
      <Text className="mt-1">사용자가 어떤 행동을 많이 하는지 — 선택한 기간 기준</Text>
      {actions.length === 0 ? (
        <Text className="mt-4 text-gray-400">기간 내 활동 없음</Text>
      ) : (
        <BarList
          className="mt-4"
          data={actions.map((a: any) => ({
            name: ACTION_LABEL[a.action_type] || a.action_type,
            value: a.count,
            color: "emerald",
          }))}
        />
      )}
    </Card>
  );
}

function SearchActivityCard({ data }: { data: any }) {
  const { top_queries } = data;
  return (
    <Card>
      <Title>🔍 검색어 TOP 10</Title>
      <Text className="mt-1">어떤 검색어가 많이 입력되고 있는지</Text>
      <div className="mt-3">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>#</TableHeaderCell>
              <TableHeaderCell>검색어</TableHeaderCell>
              <TableHeaderCell className="text-right">검색 수</TableHeaderCell>
              <TableHeaderCell className="text-right">검색한 사용자 수</TableHeaderCell>
              <TableHeaderCell className="text-right">클릭 수</TableHeaderCell>
              <TableHeaderCell className="text-right">결과 없음 수</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {top_queries.length === 0 && (
              <TableRow><TableCell colSpan={6}><Text className="text-center py-4 text-gray-400">검색 데이터 없음</Text></TableCell></TableRow>
            )}
            {top_queries.map((q: any, i: number) => (
              <TableRow key={q.query}>
                <TableCell className="text-gray-400">{i + 1}</TableCell>
                <TableCell className="font-medium">{q.query}</TableCell>
                <TableCell className="text-right">{q.search_count}</TableCell>
                <TableCell className="text-right">{q.unique_users}</TableCell>
                <TableCell className="text-right">{q.click_count}</TableCell>
                <TableCell className="text-right">
                  {q.no_result_count > 0 ? (
                    <Badge color="amber">{q.no_result_count}</Badge>
                  ) : (
                    <span className="text-gray-300">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function fmtMonthDay(iso: string): string {
  // "2026-05-10" → "5/10"
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

function InviteJoinCard({ data }: { data: any }) {
  const { signup_paths, signup_paths_trend } = data;
  const distData = [
    { name: "일반 가입", value: signup_paths.general_joins },
    { name: "초대링크", value: signup_paths.invite_joins },
  ];
  const trendData = signup_paths_trend.map((r: any) => ({ ...r, date: fmtMonthDay(r.date) }));

  return (
    <Card>
      <Title>🤝 모꼬지 가입 경로</Title>
      <Text className="mt-1">유저가 어느 경로로 모꼬지에 들어왔는지</Text>
      <div className="grid md:grid-cols-2 gap-6 mt-4">
        {/* 1. 가입 경로 분포 */}
        <div>
          <Text className="font-semibold mb-2">현재 비중 (선택 기간)</Text>
          {signup_paths.total_joins === 0 ? (
            <Text className="text-gray-400 mt-4">기간 내 가입 없음</Text>
          ) : (
            <>
              <DonutChart
                className="h-44"
                data={distData}
                category="value"
                index="name"
                colors={["sky", "rose"]}
                valueFormatter={(v) => `${v}명`}
              />
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-sky-50">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    일반 가입
                  </span>
                  <span><strong className="text-sky-700">{signup_paths.general_joins}명</strong> · {signup_paths.general_pct}%</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-rose-50">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    초대링크 가입
                  </span>
                  <span><strong className="text-rose-700">{signup_paths.invite_joins}명</strong> · {signup_paths.invite_pct}%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 2. 가입 경로별 추이 */}
        <div>
          <Text className="font-semibold mb-2">모꼬지 가입 경로별 추이</Text>
          {trendData.length === 0 ? (
            <Text className="text-gray-400 mt-4">데이터 없음</Text>
          ) : (
            <AreaChart
              className="h-72"
              data={trendData}
              index="date"
              categories={["일반", "초대링크"]}
              colors={["sky", "rose"]}
              valueFormatter={(v) => `${v}명`}
            />
          )}
        </div>
      </div>
    </Card>
  );
}



