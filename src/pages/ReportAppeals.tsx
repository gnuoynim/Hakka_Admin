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

interface ReportAppeal {
  id: number;
  link_title: string;
  link_url: string;
  category: string;
  appeal_reason: string;
  appeal_status: string;
  appeal_created_at: string;
  user_id: number;
  user_nickname: string;
  reviewed_at: string | null;
  admin_comment: string | null;
}

interface AppealDetail extends ReportAppeal {
  original_report_reason: string;
  link_action_taken: string;
  report_reviewed_at: string;
  report_admin_comment: string | null;
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

const APPEAL_STATUS_LABELS: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인됨 (링크 복구)',
  rejected: '거부됨 (삭제 유지)',
};

function getAppealStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'yellow';
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    default:
      return 'gray';
  }
}

export default function ReportAppeals() {
  const token = getToken();
  const [appeals, setAppeals] = useState<ReportAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // 필터
  const [statusFilter, setStatusFilter] = useState('pending');

  // 검토
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchAppeals();
  }, [statusFilter]);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`${API_BASE_URL}/admin/report-appeals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAppeals(data.appeals || []);
    } catch (error) {
      console.error('Failed to fetch appeals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppealDetail = async (reportId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/report-appeals/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setSelectedAppeal(data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch appeal detail:', error);
    }
  };

  const handleReview = async () => {
    if (!selectedAppeal || !reviewComment.trim()) {
      alert('검토 의견을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/report-appeals/${selectedAppeal.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: reviewDecision,
            admin_comment: reviewComment,
          }),
        }
      );

      if (response.ok) {
        alert(
          reviewDecision === 'approved'
            ? '이의신청이 승인되어 링크가 복구되었습니다.'
            : '이의신청이 거부되어 링크 삭제가 유지됩니다.'
        );
        setIsReviewOpen(false);
        setIsDetailOpen(false);
        setReviewComment('');
        fetchAppeals();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail) || '알 수 없는 오류';
        alert(`처리 실패: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Failed to review appeal:', error);
      const errorMsg = error.message || '처리 중 오류 발생';
      alert(`처리 중 오류 발생: ${errorMsg}`);
    }
  };

  const location = useLocation();

  return (
    <div className="p-6">
      {/* 네비게이션 */}
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link
          to="/"
          className={
            location.pathname === '/' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }
        >
          대시보드
        </Link>
        <Link
          to="/reports"
          className={
            location.pathname === '/reports' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }
        >
          신고 관리
        </Link>
        <Link
          to="/appeals"
          className={
            location.pathname === '/appeals' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }
        >
          소명 관리
        </Link>
        <Link
          to="/report-appeals"
          className={
            location.pathname === '/report-appeals' ? 'font-semibold text-blue-600' : 'text-gray-600 hover:text-gray-900'
          }
        >
          이의신청 관리
        </Link>
      </div>

      <Title>이의신청 관리</Title>
      <Text>링크 삭제에 대한 이의신청 검토 (처리일로부터 3일 이내 신청 가능)</Text>

      {/* 필터 */}
      <Card className="mt-6">
        <Grid numItems={1} numItemsSm={2} numItemsMd={3} className="gap-4">
          <div>
            <Text className="mb-2">상태</Text>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pending">검토 대기</SelectItem>
              <SelectItem value="approved">승인됨</SelectItem>
              <SelectItem value="rejected">거부됨</SelectItem>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={fetchAppeals}>새로고침</Button>
          </div>
        </Grid>
      </Card>

      {/* 이의신청 목록 */}
      <Card className="mt-6">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>신고 ID</TableHeaderCell>
              <TableHeaderCell>링크 제목</TableHeaderCell>
              <TableHeaderCell>카테고리</TableHeaderCell>
              <TableHeaderCell>신청자</TableHeaderCell>
              <TableHeaderCell>상태</TableHeaderCell>
              <TableHeaderCell>신청 일시</TableHeaderCell>
              <TableHeaderCell>작업</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : appeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  이의신청 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              appeals.map((appeal) => (
                <TableRow key={appeal.id}>
                  <TableCell>{appeal.id}</TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={appeal.link_title}>
                      {appeal.link_title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color="blue">
                      {CATEGORY_LABELS[appeal.category] || appeal.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{appeal.user_nickname}</TableCell>
                  <TableCell>
                    <Badge color={getAppealStatusColor(appeal.appeal_status)}>
                      {APPEAL_STATUS_LABELS[appeal.appeal_status] || appeal.appeal_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(appeal.appeal_created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </TableCell>
                  <TableCell>
                    <Button size="xs" onClick={() => fetchAppealDetail(appeal.id)}>
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
          {selectedAppeal && (
            <>
              <Title className="mb-4">이의신청 상세 (신고 #{selectedAppeal.id})</Title>

              <div className="space-y-4">
                {/* 이의신청 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">이의신청 정보</Text>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>상태:</strong>{' '}
                      <Badge color={getAppealStatusColor(selectedAppeal.appeal_status)}>
                        {APPEAL_STATUS_LABELS[selectedAppeal.appeal_status]}
                      </Badge>
                    </div>
                    <div>
                      <strong>신청자:</strong> {selectedAppeal.user_nickname} (ID: {selectedAppeal.user_id})
                    </div>
                    <div>
                      <strong>신청 일시:</strong>{' '}
                      {new Date(selectedAppeal.appeal_created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </div>
                  </div>
                </Card>

                {/* 이의신청 사유 */}
                <Card className="bg-yellow-50">
                  <Text className="font-semibold mb-2">💡 이의신청 사유</Text>
                  <p className="text-sm whitespace-pre-wrap">{selectedAppeal.appeal_reason}</p>
                </Card>

                {/* 원본 신고 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">원본 신고 정보</Text>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>카테고리:</strong>{' '}
                      <Badge color="blue">
                        {CATEGORY_LABELS[selectedAppeal.category]}
                      </Badge>
                    </div>
                    <div>
                      <strong>신고 사유:</strong>
                      <p className="mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                        {selectedAppeal.original_report_reason}
                      </p>
                    </div>
                    <div>
                      <strong>처리 결과:</strong> {selectedAppeal.link_action_taken}
                    </div>
                    <div>
                      <strong>처리 일시:</strong>{' '}
                      {new Date(selectedAppeal.report_reviewed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </div>
                    {selectedAppeal.report_admin_comment && (
                      <div>
                        <strong>원본 관리자 코멘트:</strong>
                        <p className="mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                          {selectedAppeal.report_admin_comment}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 링크 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">링크 정보</Text>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>제목:</strong> {selectedAppeal.link_title}
                    </div>
                    <div>
                      <strong>URL:</strong>{' '}
                      <a
                        href={selectedAppeal.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedAppeal.link_url}
                      </a>
                    </div>
                  </div>
                </Card>

                {/* 검토 결과 (이미 처리된 경우) */}
                {selectedAppeal.reviewed_at && (
                  <Card className="bg-gray-50">
                    <Text className="font-semibold mb-2">검토 결과</Text>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>처리 일시:</strong>{' '}
                        {new Date(selectedAppeal.reviewed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                      </div>
                      <div>
                        <strong>관리자 의견:</strong>
                        <p className="mt-1 whitespace-pre-wrap">{selectedAppeal.admin_comment}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* 액션 버튼 (pending인 경우만) */}
                {selectedAppeal.appeal_status === 'pending' && (
                  <Flex className="gap-2">
                    <Button color="green" onClick={() => setIsReviewOpen(true)}>
                      검토 처리
                    </Button>
                  </Flex>
                )}
              </div>
            </>
          )}
        </DialogPanel>
      </Dialog>

      {/* 검토 모달 */}
      <Dialog open={isReviewOpen} onClose={() => setIsReviewOpen(false)}>
        <DialogPanel>
          <Title className="mb-4">이의신청 검토</Title>

          <div className="space-y-4">
            <div>
              <Text className="mb-2">결정</Text>
              <Select
                value={reviewDecision}
                onValueChange={(val) => setReviewDecision(val as 'approved' | 'rejected')}
              >
                <SelectItem value="approved">승인 (링크 복구)</SelectItem>
                <SelectItem value="rejected">거부 (삭제 유지)</SelectItem>
              </Select>
            </div>

            <div>
              <Text className="mb-2">검토 의견 (필수)</Text>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  reviewDecision === 'approved'
                    ? '예: 확인 결과 정당한 링크로 판단되어 복구 처리합니다.'
                    : '예: 원 신고가 타당하여 링크 삭제를 유지합니다.'
                }
                rows={4}
              />
            </div>

            <Flex className="gap-2">
              <Button onClick={handleReview}>처리</Button>
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
