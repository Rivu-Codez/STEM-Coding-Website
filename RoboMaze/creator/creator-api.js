function client() { return window.StemGamePlatform.getClient(); }

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
