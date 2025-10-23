import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, supplierId } = await req.json();

    if (!projectId || !supplierId) {
      throw new Error('projectId and supplierId are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing supplier evaluation for:', { projectId, supplierId });

    // 1. Fetch project details and requirements
    const { data: project } = await supabase
      .from('projects')
      .select('*, project_requirements(*)')
      .eq('id', projectId)
      .single();

    // 2. Fetch supplier documents
    const { data: documents } = await supabase
      .from('supplier_evaluation_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId);

    // 3. Fetch questionnaire responses
    const { data: responses } = await supabase
      .from('supplier_evaluation_responses')
      .select(`
        *,
        field_questions(question_text, field_key),
        project_supplier_questions(question_text, field_key)
      `)
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId);

    // 4. Fetch or create evaluation criteria based on project requirements
    let { data: criteria } = await supabase
      .from('supplier_ai_criteria')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    // If no criteria exist, create default ones from requirements
    if (!criteria || criteria.length === 0) {
      const defaultCriteria = [
        {
          project_id: projectId,
          name: 'Bakgrunn',
          description: 'Økonomisk soliditet, organisasjon, kompetanse og sertifiseringer',
          category: 'supplier_background',
          weight: 0.15,
          source: 'auto'
        },
        {
          project_id: projectId,
          name: 'Erfaring',
          description: 'Tidligere prosjekter, referanser og bransjeerfaring',
          category: 'supplier_experience',
          weight: 0.15,
          source: 'auto'
        },
        {
          project_id: projectId,
          name: 'Leveranse',
          description: 'Leveransemodell, metodikk og risikohåndtering',
          category: 'supplier_delivery',
          weight: 0.15,
          source: 'auto'
        },
        {
          project_id: projectId,
          name: 'Support',
          description: 'Supportmodell, vedlikehold og opplæring',
          category: 'supplier_support',
          weight: 0.15,
          source: 'auto'
        },
        {
          project_id: projectId,
          name: 'Sikkerhet',
          description: 'GDPR, informasjonssikkerhet og compliance',
          category: 'supplier_security',
          weight: 0.20,
          source: 'auto'
        },
        {
          project_id: projectId,
          name: 'Teknisk',
          description: 'Arkitektur, integrasjon og skalerbarhet',
          category: 'supplier_technical',
          weight: 0.15,
          source: 'auto'
        },
        {
          project_id: projectId,
          name: 'Samarbeid',
          description: 'Samarbeidsmodell, kommunikasjon og kultur',
          category: 'supplier_collaboration',
          weight: 0.05,
          source: 'auto'
        }
      ];

      const { data: newCriteria } = await supabase
        .from('supplier_ai_criteria')
        .insert(defaultCriteria)
        .select();

      criteria = newCriteria || [];
    }

    // 5. Analyze each criterion using AI
    const scores: any[] = [];
    const risks: any[] = [];
    const followUpQuestions: any[] = [];

    for (const criterion of criteria) {
      console.log(`Analyzing criterion: ${criterion.name}`);

      // Prepare context for AI analysis
      const documentContext = documents?.map((d: any) => ({
        name: d.file_name,
        type: d.document_type,
        content: d.parsed_content || 'Not parsed yet'
      })) || [];

      const questionnaireContext = responses?.filter((r: any) => {
        const fieldKey = r.field_questions?.field_key || r.project_supplier_questions?.field_key;
        return fieldKey && fieldKey.includes(criterion.category);
      }).map((r: any) => ({
        question: r.field_questions?.question_text || r.project_supplier_questions?.question_text,
        answer: r.answer,
        score: r.score
      })) || [];

      const analysisPrompt = `
You are evaluating a supplier for an ERP procurement project.

**Criterion:** ${criterion.name}
**Description:** ${criterion.description}
**Weight:** ${criterion.weight}

**Available Documents:**
${documentContext.length > 0 ? JSON.stringify(documentContext, null, 2) : 'No documents available'}

**Questionnaire Responses:**
${questionnaireContext.length > 0 ? JSON.stringify(questionnaireContext, null, 2) : 'No responses available'}

**Project Requirements:**
${project?.project_requirements?.map((r: any) => `- ${r.title}: ${r.description}`).join('\n') || 'No specific requirements'}

Analyze this criterion and provide:
1. Document score (0-5): How well do the documents support this criterion?
2. Questionnaire score (0-5): How well do the questionnaire responses address this criterion?
3. Combined score (0-5): Overall assessment (60% documents, 40% questionnaire)
4. Justification: Clear explanation with specific references
5. Sources: List specific documents or questions referenced
6. Confidence level: low/medium/high
7. Identified risks (if any)
8. Follow-up questions (if information is missing)

Return your analysis as JSON:
{
  "document_score": 0-5,
  "questionnaire_score": 0-5,
  "combined_score": 0-5,
  "justification": "...",
  "sources": [{"type": "document"|"questionnaire", "reference": "...", "excerpt": "..."}],
  "confidence_level": "low"|"medium"|"high",
  "risks": [{"description": "...", "impact": "low"|"medium"|"high"|"critical", "likelihood": "low"|"medium"|"high"}],
  "follow_up_questions": [{"question": "...", "reason": "...", "priority": "low"|"medium"|"high"}]
}
`;

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages: [
            { role: 'system', content: 'You are an expert ERP procurement analyst. Always respond with valid JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          max_completion_tokens: 2000,
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI API error:', await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      
      // Parse JSON response
      let analysis: any;
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        analysis = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        continue;
      }

      // Store score
      scores.push({
        project_id: projectId,
        supplier_id: supplierId,
        criteria_id: criterion.id,
        document_score: analysis.document_score,
        questionnaire_score: analysis.questionnaire_score,
        combined_score: analysis.combined_score,
        justification: analysis.justification,
        sources: analysis.sources || [],
        confidence_level: analysis.confidence_level || 'medium'
      });

      // Store risks
      if (analysis.risks && analysis.risks.length > 0) {
        risks.push(...analysis.risks.map((risk: any) => ({
          project_id: projectId,
          supplier_id: supplierId,
          description: risk.description,
          impact: risk.impact,
          likelihood: risk.likelihood,
          sources: risk.sources || []
        })));
      }

      // Store follow-up questions
      if (analysis.follow_up_questions && analysis.follow_up_questions.length > 0) {
        followUpQuestions.push(...analysis.follow_up_questions.map((q: any) => ({
          project_id: projectId,
          supplier_id: supplierId,
          criteria_id: criterion.id,
          question: q.question,
          reason: q.reason,
          priority: q.priority || 'medium'
        })));
      }
    }

    // 6. Save all analysis results to database
    if (scores.length > 0) {
      await supabase.from('supplier_ai_scores').upsert(scores);
    }

    if (risks.length > 0) {
      await supabase.from('supplier_ai_risks').insert(risks);
    }

    if (followUpQuestions.length > 0) {
      await supabase.from('supplier_ai_follow_up_questions').insert(followUpQuestions);
    }

    // 7. Calculate total score
    const totalScore = scores.reduce((sum, s) => {
      const criterion = criteria.find((c: any) => c.id === s.criteria_id);
      return sum + (s.combined_score * (criterion?.weight || 0.1));
    }, 0);

    return new Response(
      JSON.stringify({
        success: true,
        totalScore,
        criteriaCount: criteria.length,
        scoresCount: scores.length,
        risksCount: risks.length,
        followUpQuestionsCount: followUpQuestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing supplier evaluation:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
