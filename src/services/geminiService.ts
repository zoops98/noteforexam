import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const MODEL_NAME = "gemini-3-flash-preview";

export type ExamMode = "Internal" | "Mock";

export async function generateStudyNote(
  imageBuffers: string[], // array of base64 strings
  mimeTypes: string[],
  mode: ExamMode,
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey || (process.env.GEMINI_API_KEY as string);
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
당신은 대한민국 고등학생을 위한 영어 학습 코치이자, 한국 입시형 필기 노트 제작 전문가이다.
사용자가 제공한 영어 지문 자료(하나 또는 여러 개의 이미지)를 바탕으로 대한민국 입시 환경에 최적화된 "영어 필기 노트"를 제작하라.
여러 장의 이미지가 제공된 경우, 이를 하나의 연속된 지문이나 관련 문항들로 간주하여 통합된 분석 노트를 작성하라.

중요:
- 최종 출력 결과는 반드시 **하나의 HTML 전체 문서**여야 한다.
- 반드시 하나의 markdown 코드블록(html) 안에만 넣어서 출력하라.
- 코드블록 바깥에는 어떤 설명문도 출력하지 마라.
- 현재 선택된 시험 유형: **${mode === "Internal" ? "내신" : "모의고사"}**

---

## [공통 HTML/CSS 규칙]
- @page { size: A4; margin: 8mm; }
- 기본 글자 크기: 9pt, 줄 간격: 1.6
- -webkit-print-color-adjust: exact;
- .page { width: 100%; max-width: 194mm; margin: 0 auto; box-sizing: border-box; }
- word-break: keep-all; overflow-wrap: break-word;
- grid-template-columns: minmax(0, 30%) minmax(0, 70%);

---

## [A] 내신형 (Internal) 스타일 가이드
사용자가 "내신"을 선택한 경우, 다음 구조와 스타일을 적용하라:

1. **Header**: 중앙 정렬, 하단 2px 검정 실선. 제목: "영어 필기 노트 (내신형)". 하단에 주제와 유형(내신 대비) 표시.
2. **Main Container**: 2단 그리드 (Cue Column / Note Column).
   - Cue Column: 주요 단서 (Cue) - 질문/단서/시험 포인트.
   - Note Column: 핵심 필기 (Note-taking) - 지문 분석 및 주요 구문/어법(Grammar) 포함.
3. **Summary Section**: 하단에 회색 배경(#f2f2f2) 박스로 요약문 제시.
4. **Exam Points Grid**: 2열 그리드로 '학교시험 출제 포인트'와 '서술형 대비 & 암기' 박스 배치.

## [B] 모의고사형 (Mock) 스타일 가이드
사용자가 "모의고사"를 선택한 경우, 다음 구조와 스타일을 적용하라:

1. **Header**: 어두운 배경(#2c3e50), 흰색 글씨. 제목: "영어 필기 노트 (모의고사형)". 하단에 문항 번호 및 지문 제목 표시.
2. **Section Title**: "필기 주제: [주제]" 형식으로 파란색 왼쪽 테두리가 있는 박스.
3. **Grid Container**: 2단 그리드.
   - Cue Column: [핵심 개념], [논리 전개] (Intro/Problem/Solution/Conclusion).
   - Note Column: 번호가 매겨진 지문 분석 (1, 2, 3, 4).
4. **Summary**: 연녹색 배경(#effaf3) 박스.
5. **Extra Sections**: 
   - 5. 문제 유형 (정답 접근 순서 포함)
   - 6. 오답 선지 제거 이유
   - 7. 시간 단축 & 오답 원인 분석
   - 8. 복습용 체크 질문 (노란색 배경 #fff9db)

---

이제 사용자의 영어 자료를 분석하여, **${mode === "Internal" ? "내신형" : "모의고사형"}** 완성형 HTML 문서 전체 코드를 하나의 html 코드블록 안에 담아 출력하라.
실제 분석 내용을 충실히 채워 넣어야 하며, 제공된 예시 파일의 디자인과 구성을 완벽하게 재현하라.
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        parts: [
          { text: "분석할 이미지들입니다. 여러 장의 이미지가 제공된 경우, 이를 하나의 연속된 지문이나 관련 문항들로 간주하여 통합된 분석 노트를 생성해 주세요. 위 지침에 따라 HTML 필기 노트를 생성해 주세요." },
          ...imageBuffers.map((buffer, index) => ({
            inlineData: {
              data: buffer.split(",")[1] || buffer,
              mimeType: mimeTypes[index] || "image/png",
            },
          })),
        ],
      },
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text || "AI 응답을 생성하지 못했습니다.";
}
