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
} from '@tremor/react';
import { getToken } from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface Appeal {
  id: number;
  sanction_id: number;
  user_id: number;
  user_nickname: string;
  appeal_reason: string;
  status: string;
  created_at: string;
  sanction_type: string;
  violation_type: string;
  sanction_reason: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '거부',
};

const SANCTION_LABELS: Record<string, string> = {
  warning: '경고',
  temp_ban: '임시 정지',
  permanent_ban: '영구 차단',
  report_restricted: '신고 제한',
};

const VIOLATION_LABELS: Record<string, string> = {
  phishing: '피싱',
  illegal_content: '불법 콘텐츠',
  privacy_violation: '개인정보 침해',
  adult_content: '성인 콘텐츠',
  spam: '스팸',
  hate_speech: '혐오 표현',
  false_report: '허위 신고',
  report_abuse: '신고 악용',
  other: '기타',
};

function getStatusColor(status: string): string {
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

export default function Appeals() {
  const token = getToken();
  const location = useLocation();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // 필터
  const [statusFilter, setStatusFilter] = useState('pending');

  // 검토
  const [reviewDecision, setReviewDecision] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchAppeals();
  }, [statusFilter]);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status_filter', statusFilter);
      params.append('limit', '200');

      const response = await fetch(`${API_BASE_URL}/admin/sanctions/appeals?${params}`, {
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

  const handleReview = async () => {
    if (!selectedAppeal || !reviewComment.trim()) {
      alert('검토 코멘트를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/sanctions/appeals/${selectedAppeal.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: reviewDecision,
            comment: reviewComment,
          }),
        }
      );

      if (response.ok) {
        alert('소명이 처리되었습니다.');
        setIsReviewOpen(false);
        setReviewComment('');
        fetchAppeals();
      } else {
        alert('처리 실패');
      }
    } catch (error) {
      console.error('Failed to review appeal:', error);
      alert('처리 중 오류 발생');
    }
  };

  return (
    <div className="p-6">
      {/* 네비게이션 */}
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link
          to="/"
          className={
            location.pathname === '/'
              ? 'font-semibold text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }
        >
          대시보드
        </Link>
        <Link
          to="/reports"
          className={
            location.pathname === '/reports'
              ? 'font-semibold text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }
        >
          신고 관리
        </Link>
        <Link
          to="/appeals"
          className={
            location.pathname === '/appeals'
              ? 'font-semibold text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }
        >
          소명 관리
        </Link>
        <Link
          to="/report-appeals"
          className={
            location.pathname === '/report-appeals'
              ? 'font-semibold text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }
        >
          이의신청 관리
        </Link>
      </div>

      <Title>소명 관리</Title>
      <Text>사용자 소명 신청 목록 및 처리</Text>

      {/* 필터 */}
      <Card className="mt-6">
        <Flex className="gap-4">
          <div className="w-48">
            <Text className="mb-2">상태</Text>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pending">대기</SelectItem>
              <SelectItem value="approved">승인</SelectItem>
              <SelectItem value="rejected">거부</SelectItem>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={fetchAppeals}>새로고침</Button>
          </div>
        </Flex>
      </Card>

      {/* 소명 목록 */}
      <Card className="mt-6">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>사용자</TableHeaderCell>
              <TableHeaderCell>제재 유형</TableHeaderCell>
              <TableHeaderCell>위반 유형</TableHeaderCell>
              <TableHeaderCell>소명 사유</TableHeaderCell>
              <TableHeaderCell>상태</TableHeaderCell>
              <TableHeaderCell>신청 일시</TableHeaderCell>
              <TableHeaderCell>작업</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : appeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  소명 신청 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              appeals.map((appeal) => (
                <TableRow key={appeal.id}>
                  <TableCell>{appeal.id}</TableCell>
                  <TableCell>{appeal.user_nickname}</TableCell>
                  <TableCell>
                    <Badge color="blue">
                      {SANCTION_LABELS[appeal.sanction_type] || appeal.sanction_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="gray">
                      {VIOLATION_LABELS[appeal.violation_type] || appeal.violation_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={appeal.appeal_reason}>
                      {appeal.appeal_reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={getStatusColor(appeal.status)}>
                      {STATUS_LABELS[appeal.status] || appeal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(appeal.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </TableCell>
                  <TableCell>
                    {appeal.status === 'pending' ? (
                      <Button
                        size="xs"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setIsReviewOpen(true);
                        }}
                      >
                        검토
                      </Button>
                    ) : (
                      <Badge color="gray">처리 완료</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 검토 모달 */}
      <Dialog open={isReviewOpen} onClose={() => setIsReviewOpen(false)}>
        <DialogPanel>
          {selectedAppeal && (
            <>
              <Title className="mb-4">소명 검토 #{selectedAppeal.id}</Title>

              <div className="space-y-4">
                {/* 제재 정보 */}
                <Card>
                  <Text className="font-semibold mb-2">원본 제재</Text>
                  <div className="space-y-1 text-sm">
                    <div>
                      <strong>제재 유형:</strong>{' '}
                      <Badge color="blue">
                        {SANCTION_LABELS[selectedAppeal.sanction_type]}
                      </Badge>
                    </div>
                    <div>
                      <strong>위반 유형:</strong>{' '}
                      <Badge color="gray">
                        {VIOLATION_LABELS[selectedAppeal.violation_type]}
                      </Badge>
                    </div>
                    <div>
                      <strong>제재 사유:</strong> {selectedAppeal.sanction_reason}
                    </div>
                  </div>
                </Card>

                {/* 소명 사유 */}
                <Card>
                  <Text className="font-semibold mb-2">소명 사유</Text>
                  <p className="text-sm whitespace-pre-wrap">{selectedAppeal.appeal_reason}</p>
                </Card>

                {/* 검토 결정 */}
                <div>
                  <Text className="mb-2">결정</Text>
                  <Select value={reviewDecision} onValueChange={setReviewDecision}>
                    <SelectItem value="approved">승인 (제재 해제)</SelectItem>
                    <SelectItem value="rejected">거부 (제재 유지)</SelectItem>
                  </Select>
                </div>

                {/* 검토 코멘트 */}
                <div>
                  <Text className="mb-2">검토 코멘트 (필수)</Text>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="검토 사유를 입력하세요..."
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
            </>
          )}
        </DialogPanel>
      </Dialog>
    </div>
  );
}
