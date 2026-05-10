import { useEffect, useState } from "react";
import {
  Card, Title, Text, Metric, Badge, DonutChart, BarList,
} from "@tremor/react";
import { getMokkojiDetail } from "../lib/api";
import type { Period } from "../lib/api";

type Props = { mokkojiId: number; period: Period; onClose: () => void };

export default function MokkojiModal({ mokkojiId, period, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMokkojiDetail(mokkojiId, period)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e?.response?.data?.detail || "데이터 로드 실패"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mokkojiId, period]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {loading && <Text>불러오는 중...</Text>}
          {err && <Text className="text-red-600">{err}</Text>}
          {data && (
            <>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Title>{data.mokkoji.name}</Title>
                  {data.mokkoji.description && <Text className="mt-1">{data.mokkoji.description}</Text>}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="p-3"><Text>멤버</Text><Metric className="text-2xl">{data.member_stats.count}</Metric></Card>
                <Card className="p-3"><Text>평균 연령</Text><Metric className="text-2xl">{data.member_stats.avg_age ?? "—"}</Metric></Card>
                <Card className="p-3">
                  <Text>성별</Text>
                  <div className="text-xs mt-1 space-x-1">
                    <Badge>♂ {data.member_stats.sex.male}</Badge>
                    <Badge color="pink">♀ {data.member_stats.sex.female}</Badge>
                  </div>
                </Card>
                <Card className="p-3">
                  <Text>연령대</Text>
                  <div className="text-xs mt-1 leading-5">
                    {Object.entries(data.member_stats.age_buckets).map(([k, v]) => (
                      <div key={k}>{k}: {String(v)}</div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <Title className="text-base">카테고리 분포</Title>
                  <DonutChart
                    className="mt-3 h-44"
                    data={data.category_distribution}
                    category="count"
                    index="name"
                  />
                </Card>
                <Card>
                  <Title className="text-base">🏷 인기 태그</Title>
                  <div className="mt-3">
                    {data.top_tags.length === 0 ? (
                      <Text>태그 없음</Text>
                    ) : (
                      <BarList data={data.top_tags.map((t: any) => ({ name: t.tag, value: t.count }))} />
                    )}
                  </div>
                </Card>
              </div>

              <Card>
                <Title className="text-base">🔥 인기 링크 TOP 5 (재방문 기준)</Title>
                <div className="mt-3 space-y-2">
                  {data.top_links.length === 0 && <Text>활동 없음</Text>}
                  {data.top_links.map((l: any, i: number) => (
                    <div key={l.id} className="flex items-center gap-3 p-2 border rounded">
                      <span className="text-gray-400 w-5 text-center">{i + 1}</span>
                      {l.thumbnail && <img src={l.thumbnail} className="w-12 h-12 rounded object-cover" alt="" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{l.title || l.url}</div>
                        <div className="text-xs text-gray-500 truncate">{l.domain}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold">{l.avg_per_user} 회</div>
                        <div className="text-xs text-gray-500">{l.unique_users}명</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
