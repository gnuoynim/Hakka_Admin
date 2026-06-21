import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Card,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Button,
  Select,
  SelectItem,
  Dialog,
  DialogPanel,
  Textarea,
  Title,
  Text,
  Flex,
  Grid,
} from '@tremor/react';
import { getToken } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface Report {
  id: number;
  link_id: number;
  link_title: string;
  link_url: string;
  reporter_id: number | null;
  reporter_nickname: string;
  category: string;
  status: string;
  priority: string;
  auto_flagged: boolean;
  created_at: string;
  mokkoji_name: string;
}

interface ReportDetail {
  id: number;
  link_id: number;
  category: string;
  reason: string;
  status: string;
  priority: string;
  auto_flagged: boolean;
  auto_flag_reason: string | null;
  created_at: string;
  link_url_snapshot: string;
  link_title_snapshot: string | null;
  link_description_snapshot: string | null;
  link_thumbnail_snapshot: string | null;
  link_domain_snapshot: string | null;
  link_owner_id: number | null;
  link_owner_nickname: string | null;
  link_guest_nickname: string | null;
  reporter_id: number | null;
  reporter_nickname: string;
  reporter_ip: string | null;
  mokkoji_id: number;
  mokkoji_name: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_decision: string | null;
  admin_comment: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  phishing_malware: '피싱/악성코드',
  illegal_content: '불법 콘텐츠',
  privacy_violation: '개인정보 침해',
  adult_content: '성인 콘텐츠',
  spam: '스팸',
  hate_speech: '혐오 표현',
  other: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  under_review: '검토 중',
  auto_processed: '자동 처리',
  awaiting_appeal: '소명 대기',
  resolved_violation: '위반 확인',
  resolved_no_violation: '위반 없음',
  dismissed: '기각',
};

function getCategoryColor(category: string): string {
  if (['phishing_malware', 'illegal_content', 'privacy_violation'].includes(category)) {
    return 'red';
  }
  if (['adult_content', 'spam', 'hate_speech'].includes(category)) {
    return 'yellow';
  }
  return 'gray';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'blue';
    case 'under_review':
      return 'yellow';
    case 'resolved_violation':
      return 'red';
    case 'resolved_no_violation':
      return 'green';
    case 'dismissed':
      return 'gray';
    default:
      return 'gray';
  }
}

export default function Reports() {
  const token = getToken();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // 필터
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // 검토
  const [reviewDecision, setReviewDecision] = useState('violation');
  const [reviewComment, setReviewComment] = useState('');
  const [applySanction, setApplySanction] = useState(false);
  const [sanctionSeverity, setSanctionSeverity] = useState('auto'); // none | warning | auto | permanent

  useEffect(() => {
    fetchReports();
  }, [categoryFilter, statusFilter, priorityFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      params.append('limit', '100');

      const response = await fetch(`${API_BASE_URL}/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportDetail = async (reportId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSelectedReport(data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch report detail:', error);
    }
  };

  const handleReview = async () => {
    if (!selectedReport || !reviewComment.trim()) {
      alert('처리 코멘트를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/reports/${selectedReport.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision: reviewDecision,
          comment: reviewComment,
          apply_sanction: applySanction,
          sanction_severity: sanctionSeverity,
        }),
      });

      if (response.ok) {
        alert('신고가 처리되었습니다.');
        setIsReviewOpen(false);
        setIsDetailOpen(false);
        setReviewComment('');
        setApplySanction(false);
        setSanctionSeverity('auto');
        fetchReports();
      } else {
        alert('처리 실패');
      }
    } catch (error) {
      console.error('Failed to review report:', error);
      alert('처리 중 오류 발생');
    }
  };

  const handleDismiss = async () => {
    if (!selectedReport) return;

    const reason = prompt('허위 신고 판단 사유를 입력하세요 (최소 5자):');
    if (!reason || reason.length < 5) {
      alert('사유를 5자 이상 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/reports/${selectedReport.id}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        alert('허위 신고로 처리되었습니다.');
        setIsDetailOpen(false);
        fetchReports();
      } else {
        alert('처리 실패');
      }
    } catch (error) {
      console.error('Failed to dismiss report:', error);
      alert('처리 중 오류 발생');
    }
  };

  const location = useLocation();

  return (
    <div className="p-6">
      {/* 네비게이션 */}
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link
          to="/"
          className={location.pathname === '/' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'}
        >
          대시보드
        </Link>
        <Link
          to="/reports"
          className={location.pathname === '/reports' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'}
        >
          신고 관리
        </Link>
        <Link
          to="/appeals"
          className={location.pathname === '/appeals' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'}
        >
          소명 관리
        </Link>
        <Link
          to="/report-appeals"
          className={location.pathname === '/report-appeals' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'}
        >
          이의신청 관리
        </Link>
      </div>

      <Title>신고 관리</Title>
      <Text>링크 신고 목록 및 처리</Text>

      {/* 필터 */}
      <Card className="mt-6">
        <Grid numItems={1} numItemsSm={2} numItemsMd={4} className="gap-4">
          <div>
            <Text className="mb-2">카테고리</Text>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="phishing_malware">피싱/악성코드</SelectItem>
              <SelectItem value="illegal_content">불법 콘텐츠</SelectItem>
              <SelectItem value="privacy_violation">개인정보 침해</SelectItem>
              <SelectItem value="adult_content">성인 콘텐츠</SelectItem>
              <SelectItem value="spam">스팸</SelectItem>
              <SelectItem value="hate_speech">혐오 표현</SelectItem>
              <SelectItem value="other">기타</SelectItem>
            </Select>
          </div>

          <div>
            <Text className="mb-2">상태</Text>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="under_review">검토 중</SelectItem>
              <SelectItem value="resolved_violation">위반 확인</SelectItem>
              <SelectItem value="resolved_no_violation">위반 없음</SelectItem>
              <SelectItem value="dismissed">기각</SelectItem>
            </Select>
          </div>

          <div>
            <Text className="mb-2">우선순위</Text>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="high">높음</SelectItem>
              <SelectItem value="normal">보통</SelectItem>
              <SelectItem value="low">낮음</SelectItem>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={fetchReports}>새로고침</Button>
          </div>
        </Grid>
      </Card>

      {/* 신고 목록 */}
      <Card className="mt-6">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>링크 제목</TableHeaderCell>
              <TableHeaderCell>카테고리</TableHeaderCell>
              <TableHeaderCell>상태</TableHeaderCell>
              <TableHeaderCell>우선순위</TableHeaderCell>
              <TableHeaderCell>신고자</TableHeaderCell>
              <TableHeaderCell>모꼬지</TableHeaderCell>
              <TableHeaderCell>신고 일시</TableHeaderCell>
              <TableHeaderCell>작업</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  신고 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.id}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={report.link_title}>
                      {report.link_title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={getCategoryColor(report.category)}>
                      {CATEGORY_LABELS[report.category] || report.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={getStatusColor(report.status)}>
                      {STATUS_LABELS[report.status] || report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {report.priority === 'high' ? (
                      <Badge color="red">높음</Badge>
                    ) : report.priority === 'normal' ? (
                      <Badge color="gray">보통</Badge>
                    ) : (
                      <Badge color="blue">낮음</Badge>
                    )}
                  </TableCell>
                  <TableCell>{report.reporter_nickname}</TableCell>
                  <TableCell>{report.mokkoji_name}</TableCell>
                  <TableCell>
                    {new Date(report.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </TableCell>
                  <TableCell>
                    <Button size="xs" onClick={() => fetchReportDetail(report.id)}>
                      상세
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 상세 모달 */}
      <Dialog open={isDetailOpen} onClose={() => setIsDetailOpen(false)}>
        <DialogPanel className="max-w-4xl">
          {selectedReport && (
            <>
              <Title className="mb-4">신고 상세 #{selectedReport.id}</Title>

              <div className="space-y-4">
                {/* 기본 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">신고 정보</Text>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>카테고리: <Badge color={getCategoryColor(selectedReport.category)}>{CATEGORY_LABELS[selectedReport.category]}</Badge></div>
                    <div>상태: <Badge color={getStatusColor(selectedReport.status)}>{STATUS_LABELS[selectedReport.status]}</Badge></div>
                    <div>우선순위: {selectedReport.priority}</div>
                    <div>자동 플래그: {selectedReport.auto_flagged ? '예' : '아니오'}</div>
                    {selectedReport.auto_flag_reason && (
                      <div className="col-span-2">자동 플래그 사유: {selectedReport.auto_flag_reason}</div>
                    )}
                  </div>
                </Card>

                {/* 신고 사유 */}
                <Card>
                  <Text className="font-semibold mb-2">신고 사유</Text>
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.reason}</p>
                </Card>

                {/* 링크 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">링크 정보 (스냅샷)</Text>
                  <div className="space-y-2 text-sm">
                    <div><strong>제목:</strong> {selectedReport.link_title_snapshot || '없음'}</div>
                    <div><strong>URL:</strong> <a href={selectedReport.link_url_snapshot} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedReport.link_url_snapshot}</a></div>
                    <div><strong>도메인:</strong> {selectedReport.link_domain_snapshot}</div>
                    {selectedReport.link_description_snapshot && (
                      <div><strong>설명:</strong> {selectedReport.link_description_snapshot}</div>
                    )}
                    <div><strong>작성자:</strong> {selectedReport.link_owner_nickname || selectedReport.link_guest_nickname || '알 수 없음'}</div>
                  </div>
                </Card>

                {/* 신고자 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">신고자 정보</Text>
                  <div className="space-y-1 text-sm">
                    <div>닉네임: {selectedReport.reporter_nickname}</div>
                    <div>IP: {selectedReport.reporter_ip || '정보 없음'}</div>
                  </div>
                </Card>

                {/* 처리 정보 */}
                {selectedReport.reviewed_by && (
                  <Card>
                    <Text className="font-semibold mb-2">처리 정보</Text>
                    <div className="space-y-1 text-sm">
                      <div>처리자: {selectedReport.reviewed_by}</div>
                      <div>처리 일시: {selectedReport.reviewed_at ? new Date(selectedReport.reviewed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'}</div>
                      <div>결정: {selectedReport.admin_decision}</div>
                      <div>코멘트: {selectedReport.admin_comment}</div>
                    </div>
                  </Card>
                )}

                {/* 액션 버튼 */}
                {selectedReport.status === 'pending' || selectedReport.status === 'under_review' ? (
                  <Flex className="gap-2">
                    <Button onClick={() => setIsReviewOpen(true)}>
                      검토 처리
                    </Button>
                    <Button color="red" onClick={handleDismiss}>
                      허위 신고
                    </Button>
                  </Flex>
                ) : null}
              </div>
            </>
          )}
        </DialogPanel>
      </Dialog>

      {/* 검토 모달 */}
      <Dialog open={isReviewOpen} onClose={() => setIsReviewOpen(false)}>
        <DialogPanel>
          <Title className="mb-4">신고 검토</Title>

          <div className="space-y-4">
            <div>
              <Text className="mb-2">결정</Text>
              <Select value={reviewDecision} onValueChange={setReviewDecision}>
                <SelectItem value="violation">위반 확인 (링크 삭제)</SelectItem>
                <SelectItem value="no_violation">위반 없음 (복구)</SelectItem>
              </Select>
            </div>

            {reviewDecision === 'violation' && (
              <>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applySanction}
                      onChange={(e) => {
                        setApplySanction(e.target.checked);
                        if (!e.target.checked) {
                          setSanctionSeverity('auto');
                        }
                      }}
                    />
                    <Text>제재 적용 (게시자에게 제재 부과)</Text>
                  </label>
                </div>

                {applySanction && (
                  <div>
                    <Text className="mb-2">제재 수준</Text>
                    <Select value={sanctionSeverity} onValueChange={setSanctionSeverity}>
                      <SelectItem value="warning">경미한 위반 (경고만 부여)</SelectItem>
                      <SelectItem value="auto">일반 위반 (누적 정책에 따라 자동 제재)</SelectItem>
                      <SelectItem value="permanent">중대한 위반 (영구 차단)</SelectItem>
                    </Select>
                    <Text className="text-xs text-gray-500 mt-2">
                      {sanctionSeverity === 'warning' && '• 링크 삭제 + 경고 부여 (제재 없음)'}
                      {sanctionSeverity === 'auto' && '• 링크 삭제 + 위반 유형 및 누적 횟수에 따라 자동 제재 (고위험: 영구 차단, 중간위험: 3일→7일→30일→영구, 저위험: 경고→3일→7일)'}
                      {sanctionSeverity === 'permanent' && '• 링크 삭제 + 즉시 영구 차단 (불법 자료, 심각한 위반 시 사용)'}
                    </Text>
                  </div>
                )}
              </>
            )}

            <div>
              <Text className="mb-2">처리 코멘트 (필수)</Text>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="처리 사유를 입력하세요..."
                rows={4}
              />
            </div>

            <Flex className="gap-2">
              <Button onClick={handleReview}>
                처리
              </Button>
              <Button variant="secondary" onClick={() => setIsReviewOpen(false)}>
                취소
              </Button>
            </Flex>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
