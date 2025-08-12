// Demo script to populate the system with sample session notes containing AI tags
// This will demonstrate the Tag Analytics visualization feature

const sampleSessionNotes = [
  {
    clientId: "Carlos Martinez",
    content: "Carlos attended today's session expressing significant distress about his recent job loss. He appeared visibly agitated when describing the termination meeting.",
    title: "Job Loss and Identity Crisis",
    subjective: "Client reports feeling 'completely hollowed out' and experiencing emotional numbness since job termination.",
    objective: "Client presented with constricted affect, minimal eye contact when discussing job loss, visible muscle tension.",
    assessment: "Client continues to meet criteria for Major Depressive Disorder, exacerbated by recent job loss and identity crisis.",
    plan: "Continue ACT interventions focusing on acceptance of difficult emotions. Implement behavioral activation strategies.",
    tags: ["depression", "job-loss", "identity-crisis", "emotional-avoidance"],
    aiTags: ["major-depressive-disorder", "act-therapy", "behavioral-activation", "emotional-numbness", "identity-fusion", "grief-processing"],
    sessionDate: new Date("2025-08-10")
  },
  {
    clientId: "Sarah Chen",
    content: "Sarah discussed her ongoing anxiety about social situations and fear of judgment from colleagues.",
    title: "Social Anxiety and Workplace Challenges",
    subjective: "Client reports increased anxiety symptoms, particularly in work meetings and social gatherings.",
    objective: "Client appeared fidgety, rapid speech when discussing anxiety triggers, good eye contact maintained.",
    assessment: "Generalized Anxiety Disorder with social anxiety features. Symptoms intensifying due to new job responsibilities.",
    plan: "Continue CBT interventions, introduce exposure therapy for social situations, mindfulness for anxiety management.",
    tags: ["anxiety", "social-anxiety", "workplace-stress", "fear-of-judgment"],
    aiTags: ["generalized-anxiety-disorder", "cbt-therapy", "exposure-therapy", "mindfulness", "social-phobia", "cognitive-restructuring"],
    sessionDate: new Date("2025-08-09")
  },
  {
    clientId: "Michael Rodriguez",
    content: "Michael explored his relationship patterns and difficulties with emotional intimacy following his recent breakup.",
    title: "Relationship Patterns and Attachment Issues",
    subjective: "Client reports feeling 'scared to get close to anyone again' and recognizing patterns of emotional withdrawal.",
    objective: "Client maintained good engagement, some tearfulness when discussing past relationships, reflective mood.",
    assessment: "Adjustment disorder with depressed mood following relationship loss. Underlying attachment difficulties noted.",
    plan: "Explore attachment patterns through narrative therapy, process grief related to relationship loss, develop emotional regulation skills.",
    tags: ["relationships", "attachment", "breakup-grief", "emotional-intimacy"],
    aiTags: ["adjustment-disorder", "attachment-therapy", "narrative-therapy", "grief-counseling", "emotional-regulation", "intimacy-issues"],
    sessionDate: new Date("2025-08-08")
  },
  {
    clientId: "Jennifer Thompson",
    content: "Jennifer discussed her progress with DBT skills and recent reduction in self-harm behaviors.",
    title: "DBT Progress and Self-Harm Reduction",
    subjective: "Client reports using distress tolerance skills successfully, no self-harm incidents in past two weeks.",
    objective: "Client appeared more regulated than previous sessions, demonstrated mindfulness techniques in session.",
    assessment: "Borderline Personality Disorder with improvement in emotional regulation. Significant progress in therapy goals.",
    plan: "Continue DBT skills training, focus on interpersonal effectiveness module, reinforce distress tolerance gains.",
    tags: ["dbt", "self-harm-reduction", "emotional-regulation", "distress-tolerance"],
    aiTags: ["borderline-personality-disorder", "dbt-therapy", "self-harm-recovery", "mindfulness-skills", "emotional-dysregulation", "distress-tolerance-skills"],
    sessionDate: new Date("2025-08-07")
  },
  {
    clientId: "David Kim",
    content: "David processed trauma memories related to his military service using EMDR techniques.",
    title: "EMDR Trauma Processing Session",
    subjective: "Client reports nightmares decreasing in frequency, able to discuss combat experiences with less activation.",
    objective: "Client remained grounded throughout EMDR processing, showed appropriate emotional responses to memories.",
    assessment: "PTSD symptoms showing improvement with EMDR treatment. Trauma processing progressing effectively.",
    plan: "Continue EMDR protocol, install positive cognitions, assess for additional trauma targets.",
    tags: ["trauma", "ptsd", "emdr", "military-trauma", "nightmares"],
    aiTags: ["post-traumatic-stress-disorder", "emdr-therapy", "trauma-processing", "combat-ptsd", "nightmare-reduction", "positive-cognitions"],
    sessionDate: new Date("2025-08-06")
  },
  {
    clientId: "Lisa Adams",
    content: "Lisa worked on mindfulness practices and discussed her meditation routine for managing chronic anxiety.",
    title: "Mindfulness Practice and Anxiety Management",
    subjective: "Client reports daily meditation practice helping with anxiety, still struggling with racing thoughts at bedtime.",
    objective: "Client demonstrated good mindfulness technique in session, spoke calmly about anxiety triggers.",
    assessment: "Anxiety symptoms well-managed with mindfulness practice. Sleep difficulties persist.",
    plan: "Continue mindfulness training, introduce sleep hygiene techniques, body scan meditation for bedtime.",
    tags: ["mindfulness", "meditation", "chronic-anxiety", "sleep-issues"],
    aiTags: ["anxiety-management", "mindfulness-based-therapy", "sleep-hygiene", "racing-thoughts", "body-scan-meditation", "chronic-anxiety-disorder"],
    sessionDate: new Date("2025-08-05")
  },
  {
    clientId: "Robert Johnson",
    content: "Robert discussed his substance use recovery progress and challenges with maintaining sobriety.",
    title: "Substance Use Recovery and Relapse Prevention",
    subjective: "Client reports 45 days of sobriety, attending AA meetings regularly, struggling with cravings during stress.",
    objective: "Client appeared committed to recovery, discussed triggers openly, good insight into addiction patterns.",
    assessment: "Alcohol Use Disorder in early remission. Strong motivation for recovery with ongoing vulnerability to stress-induced cravings.",
    plan: "Continue addiction counseling, strengthen coping strategies for stress, explore trauma underlying substance use.",
    tags: ["addiction-recovery", "sobriety", "aa-meetings", "stress-cravings"],
    aiTags: ["alcohol-use-disorder", "addiction-counseling", "relapse-prevention", "stress-management", "twelve-step-program", "trauma-informed-care"],
    sessionDate: new Date("2025-08-04")
  },
  {
    clientId: "Maria Santos",
    content: "Maria explored her perfectionism and how it impacts her work performance and self-esteem.",
    title: "Perfectionism and Self-Worth Issues",
    subjective: "Client reports feeling 'never good enough' despite professional success, constant self-criticism.",
    objective: "Client appeared tense when discussing work performance, self-deprecating language noted throughout session.",
    assessment: "Perfectionism with underlying self-worth issues. Anxiety and depression symptoms secondary to perfectionist beliefs.",
    plan: "Challenge perfectionist cognitions through CBT, explore origins of self-criticism, practice self-compassion exercises.",
    tags: ["perfectionism", "self-worth", "self-criticism", "work-performance"],
    aiTags: ["perfectionist-beliefs", "cognitive-behavioral-therapy", "self-compassion", "self-esteem-issues", "performance-anxiety", "cognitive-distortions"],
    sessionDate: new Date("2025-08-03")
  },
  {
    clientId: "James Wilson",
    content: "James processed grief related to his father's recent death and explored complicated feelings of anger and relief.",
    title: "Complicated Grief Processing",
    subjective: "Client reports conflicted emotions about father's death, guilt over feeling relieved, struggling with anger.",
    objective: "Client showed appropriate range of emotions, some tearfulness, able to explore difficult feelings.",
    assessment: "Complicated grief with ambivalent feelings toward deceased father. Normal grief process complicated by relationship history.",
    plan: "Continue grief processing, normalize complicated emotions, explore relationship history with father.",
    tags: ["grief", "complicated-grief", "anger", "guilt", "father-death"],
    aiTags: ["complicated-bereavement", "grief-counseling", "ambivalent-grief", "guilt-processing", "anger-work", "family-dynamics"],
    sessionDate: new Date("2025-08-02")
  },
  {
    clientId: "Amy Foster",
    content: "Amy discussed her progress with exposure therapy for agoraphobia and recent successful outings.",
    title: "Agoraphobia Treatment Progress",
    subjective: "Client reports successfully going to grocery store alone, still anxious but manageable with coping skills.",
    objective: "Client appeared proud of recent accomplishments, less avoidant behavior noted in session.",
    assessment: "Agoraphobia showing significant improvement with exposure therapy. Client building confidence and independence.",
    plan: "Continue systematic desensitization, expand exposure exercises, reinforce progress achievements.",
    tags: ["agoraphobia", "exposure-therapy", "systematic-desensitization", "independence"],
    aiTags: ["agoraphobia-treatment", "systematic-desensitization", "exposure-exercises", "anxiety-disorders", "confidence-building", "behavioral-therapy"],
    sessionDate: new Date("2025-08-01")
  }
];

console.log('Demo Session Notes for Tag Analytics:');
console.log(`Total Notes: ${sampleSessionNotes.length}`);

// Analyze the tags for demonstration
const allTags = [];
const allAITags = [];

sampleSessionNotes.forEach(note => {
  allTags.push(...(note.tags || []));
  allAITags.push(...(note.aiTags || []));
});

const tagCounts = {};
const aiTagCounts = {};

allTags.forEach(tag => {
  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
});

allAITags.forEach(tag => {
  aiTagCounts[tag] = (aiTagCounts[tag] || 0) + 1;
});

console.log('\nMost Common Manual Tags:');
Object.entries(tagCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

console.log('\nMost Common AI Tags:');
Object.entries(aiTagCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));

console.log('\nSemantic Categories Represented:');
const categories = ['Emotional', 'Behavioral', 'Therapeutic', 'Cognitive'];
categories.forEach(category => {
  const categoryTags = [...allTags, ...allAITags].filter(tag => {
    const emotional = ['anxiety', 'depression', 'anger', 'grief', 'fear', 'stress', 'guilt'];
    const behavioral = ['self-harm', 'addiction', 'avoidance', 'exposure', 'sobriety', 'sleep'];
    const therapeutic = ['cbt', 'dbt', 'emdr', 'mindfulness', 'therapy', 'counseling'];
    const cognitive = ['perfectionism', 'self-criticism', 'thoughts', 'beliefs', 'cognitive'];
    
    if (category === 'Emotional' && emotional.some(keyword => tag.includes(keyword))) return true;
    if (category === 'Behavioral' && behavioral.some(keyword => tag.includes(keyword))) return true;
    if (category === 'Therapeutic' && therapeutic.some(keyword => tag.includes(keyword))) return true;
    if (category === 'Cognitive' && cognitive.some(keyword => tag.includes(keyword))) return true;
    return false;
  });
  console.log(`  ${category}: ${categoryTags.length} tags`);
});

console.log('\nThis data will demonstrate the Tag Analytics visualization with realistic clinical tagging patterns.');

module.exports = { sampleSessionNotes };