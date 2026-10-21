function client() { return window.StemGamePlatform.getClient(); }

export async function loadLatestCreatorLevel(academyLevel = 31) {
  const result = await client().rpc('get_my_creator_level', { p_academy_level: academyLevel });
  return { ...result, data: result.data || null };
}

export async function submitCreatorAttempt(creatorLevelId, program) {
  const attemptId = window.crypto?.randomUUID?.();
  if (!attemptId) return { ok: false, error: 'Attempt ID unavailable.' };
  const result = await client().rpc('submit_creator_level_attempt', {
    p_creator_level_id: creatorLevelId,
    p_attempt_id: attemptId,
    p_program: program,
  });
  if (result.error) return { ok: false, error: result.error.message, data: result.data };
  return { ok: true, data: result.data };
}

export async function saveDraft(draft) {
  const result = await client().rpc('save_creator_level', {
    p_creator_level_id: draft.id || null,
    p_academy_level: draft.academyLevel,
    p_title: draft.title,
    p_description: draft.description,
    p_definition: draft.definition,
  });
  return result;
}

export async function publishDraft(id) {
  return client().rpc('publish_creator_level', { p_creator_level_id: id });
}
