import { storage } from './server/storage.js';

async function addStevenDelucaProgressNotes() {
  const clientId = '23026f2f-fda8-418a-8325-edb7b5eca45d';
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
  
  // Get Steven's appointments to link progress notes to
  const appointments = await storage.getAppointmentsByClient(clientId);
  console.log(`Found ${appointments.length} appointments for Steven Deluca`);
  
  const progressNotes = [
    {
      id: `pn_steven_${Date.now()}_001`,
      clientId,
      therapistId,
      appointmentId: appointments.find(apt => apt.startTime.includes('2025-07-28'))?.id,
      sessionDate: new Date('2025-07-28'),
      sessionType: 'Individual Therapy',
      duration: 50,
      content: 'Steven presented today discussing ongoing anxiety about work performance and interpersonal relationships. He reported difficulty sleeping and increased worry about upcoming presentations at work. We explored cognitive behavioral techniques for managing anticipatory anxiety.',
      subjective: 'Client reports increased anxiety levels, particularly around work situations. Sleep difficulties noted with ruminating thoughts keeping him awake. States he feels overwhelmed by expectations.',
      objective: 'Client appeared somewhat restless, maintained good eye contact. Speech was clear and goal-directed. Mood appeared anxious but stable. Engaged well in therapeutic discussion.',
      assessment: 'Steven is demonstrating symptoms consistent with generalized anxiety disorder. His coping skills are developing but require reinforcement. He shows good insight into his patterns.',
      plan: 'Continue CBT techniques. Introduce mindfulness exercises for sleep hygiene. Schedule follow-up in one week. Homework: practice breathing exercises daily.',
      keyPoints: ['work anxiety', 'sleep disturbance', 'CBT techniques', 'mindfulness introduction'],
      significantQuotes: ['I just cant turn my brain off at night', 'I feel like Im always waiting for something bad to happen'],
      narrativeSummary: 'Productive session focusing on anxiety management strategies and sleep hygiene techniques.',
      aiTags: ['anxiety-management', 'work-stress', 'sleep-issues', 'CBT-techniques', 'mindfulness'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: `pn_steven_${Date.now()}_002`,
      clientId,
      therapistId,
      appointmentId: appointments.find(apt => apt.startTime.includes('2025-07-14'))?.id,
      sessionDate: new Date('2025-07-14'),
      sessionType: 'Individual Therapy',
      duration: 50,
      content: 'Steven reported improvement in sleep patterns after implementing breathing exercises. Discussed workplace stressors in more detail, including specific triggers and response patterns. Explored assertiveness skills for better boundary setting with colleagues.',
      subjective: 'Client notes better sleep quality this week. Reports feeling more confident at work but still struggles with saying no to additional responsibilities. Anxiety levels decreased but still present.',
      objective: 'Client appeared more relaxed than previous session. Good eye contact maintained. Affect was brighter, speech pace normal. Demonstrated understanding of concepts discussed.',
      assessment: 'Positive progress noted in sleep quality and overall anxiety management. Steven is responding well to CBT interventions. Boundary setting remains an area for continued focus.',
      plan: 'Continue mindfulness practice. Role-play assertiveness scenarios. Discuss time management strategies. Next session in one week.',
      keyPoints: ['improved sleep', 'workplace boundaries', 'assertiveness training', 'continued CBT'],
      significantQuotes: ['The breathing really does help', 'I said no to overtime this week and it felt good'],
      narrativeSummary: 'Significant improvement shown in sleep and beginning to develop better workplace boundaries.',
      aiTags: ['improved-sleep', 'boundary-setting', 'assertiveness', 'workplace-stress', 'progress'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: `pn_steven_${Date.now()}_003`,
      clientId,
      therapistId,
      appointmentId: appointments.find(apt => apt.startTime.includes('2025-07-08'))?.id,
      sessionDate: new Date('2025-07-08'),
      sessionType: 'Individual Therapy',
      duration: 50,
      content: 'Steven discussed a challenging work presentation that went well, attributing success to preparation and breathing techniques learned in therapy. Explored self-esteem and perfectionist tendencies that contribute to his anxiety.',
      subjective: 'Client reports successful work presentation and feels proud of his performance. Notes that perfectionist thoughts still create pressure but he is more aware of them now.',
      objective: 'Client appeared confident and animated when discussing his success. Posture was upright, voice had more energy. Demonstrated good self-reflection skills.',
      assessment: 'Steven is making excellent progress in applying coping strategies in real-world situations. His self-awareness around perfectionist patterns is improving. Confidence building is evident.',
      plan: 'Explore origins of perfectionist patterns. Introduce self-compassion exercises. Continue reinforcing successful coping strategies. Next session in one week.',
      keyPoints: ['successful presentation', 'perfectionism awareness', 'self-compassion', 'confidence building'],
      significantQuotes: ['I actually enjoyed giving the presentation', 'I realized I was being harder on myself than anyone else would be'],
      narrativeSummary: 'Excellent progress demonstrated through successful real-world application of therapeutic techniques.',
      aiTags: ['confidence-building', 'perfectionism', 'self-compassion', 'success', 'presentation-skills'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  for (const note of progressNotes) {
    try {
      await storage.createProgressNote(note);
      console.log(`Created progress note for ${note.sessionDate.toDateString()}`);
    } catch (error) {
      console.error(`Error creating progress note:`, error);
    }
  }
  
  console.log(`Successfully added ${progressNotes.length} progress notes for Steven Deluca`);
}

addStevenDelucaProgressNotes().catch(console.error);