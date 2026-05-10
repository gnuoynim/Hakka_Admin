import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { Card, Title, Text } from "@tremor/react";
import { adminLogin, setToken } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSuccess = async (resp: CredentialResponse) => {
    if (!resp.credential) {
      setError("구글 인증 응답이 비어있습니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { admin_token } = await adminLogin(resp.credential);
      setToken(admin_token);
      await refresh();
      navigate("/", { replace: true });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 403) setError(detail || "권한이 없는 계정입니다.");
      else if (e?.response?.status === 401) setError(detail || "구글 인증 실패");
      else if (e?.response?.status === 429) setError("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
      else setError(detail || "로그인 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <Title>Hakka Admin</Title>
          <Text className="mt-2">화이트리스트에 등록된 Google 계정만 접속 가능합니다.</Text>
        </div>
        <div className="flex justify-center my-6">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError("구글 인증에 실패했습니다.")}
            useOneTap={false}
          />
        </div>
        {busy && <Text className="text-center mt-2">로그인 중...</Text>}
        {error && (
          <div className="mt-4 p-3 rounded bg-red-50 border border-red-200">
            <Text className="text-red-700">{error}</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
