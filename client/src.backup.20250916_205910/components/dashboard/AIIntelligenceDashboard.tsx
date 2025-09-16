import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, AlertTriangle, CheckCircle, Brain, Target, TrendingUp, Users, Clock, Star, BookOpen, Shield } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface AIIntelligenceDashboardProps {
  therapistId: string;
  clientId?: string;
}

interface PredictiveInsight {
  treatmentOutcomePrediction: {
    successProbability: number;
    confidenceLevel: string;
    estimatedSessionsToGoal: number;
    keySuccessFactors: string[];
    potentialBarriers: string[];
  };
  riskEscalationAlerts: {
    riskLevel: 'low' | 'moderate' | 'high';
    earlyWarningIndicators: string[];
    preventiveActions: string[];
    monitoringFrequency: string;
  };
  optimalInterventionTiming: {
    currentPhase: string;
    readinessForAdvancedTechniques: boolean;
    recommendedNextInterventions: string[];
    timingRationale: string;
  };
}

interface PatternAnalysis {
  successfulInterventionPatterns: Array<{
    pattern: string;
    successRate: number;
    optimalTiming: string;
    clientTypes: string[];
  }>;
  breakthroughIndicators: string[];
  engagementSuccessFactors: string[];
  recommendedTechniques: string[];
}

interface PersonalizedRecommendations {
  primaryModalities: Array<{
    approach: string;
    evidenceLevel: 'strong' | 'moderate' | 'emerging';
    suitabilityScore: number;
    rationale: string;
    specificTechniques: string[];
  }>;
  adaptationRecommendations: string[];
  contraindications: string[];
}

interface PracticeIntelligence {
  currentEfficiencyMetrics: {
    sessionUtilization: number;
    progressPerSession: number;
    clientSatisfactionIndicators: string[];
  };
  optimizationOpportunities: Array<{
    area: string;
    currentState: string;
    recommendation: string;
    expectedImprovement: string;
  }>;
  retentionAnalysis: {
    retentionRisk: {
      level: 'low' | 'moderate' | 'high';
      probability: number;
      riskFactors: string[];
      protectiveFactors: string[];
    };
    retentionStrategies: Array<{
      strategy: string;
      rationale: string;
      implementation: string;
      expectedOutcome: string;
    }>;
  };
}

interface TherapistInsights {
  clinicalStrengths: Array<{
    strength: string;
    evidenceBase: string;
    clientTypes: string[];
    effectiveness: number;
  }>;
  specializations: string[];
  professionalGrowthAreas: Array<{
    area: string;
    currentLevel: string;
    developmentOpportunity: string;
    resources: string[];
  }>;
  practiceNiche: string;
  uniqueTherapeuticGifts: string[];
}

export function AIIntelligenceDashboard({ therapistId, clientId }: AIIntelligenceDashboardProps) {
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight | null>(null);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [personalizedRecs, setPersonalizedRecs] = useState<PersonalizedRecommendations | null>(null);
  const [practiceIntelligence, setPracticeIntelligence] = useState<PracticeIntelligence | null>(null);
  const [therapistInsights, setTherapistInsights] = useState<TherapistInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('predictive');
  const { toast } = useToast();

  useEffect(() => {
    if (therapistId) {
      loadAIIntelligence();
    }
  }, [therapistId, clientId]);

  const loadAIIntelligence = async () => {
    setIsLoading(true);
    try {
      // Load all AI intelligence modules
      await Promise.all([
        loadPredictiveInsights(),
        loadPatternAnalysis(),
        loadPersonalizedRecommendations(),
        loadPracticeIntelligence(),
        loadTherapistInsights()
      ]);
    } catch (error) {
      console.error('Error loading AI intelligence:', error);
      toast({ title: 'Failed to load AI intelligence', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPredictiveInsights = async () => {
    if (!clientId) return;
    
    try {
      const response = await fetch('/api/ai/predict-treatment-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, currentSessionCount: 8 })
      });
      
      if (response.ok) {
        const insights = await response.json();
        setPredictiveInsights(insights);
      }
    } catch (error) {
      console.error('Error loading predictive insights:', error);
    }
  };

  const loadPatternAnalysis = async () => {
    try {
      const response = await fetch('/api/ai/cross-client-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapistId })
      });
      
      if (response.ok) {
        const patterns = await response.json();
        setPatternAnalysis(patterns);
      }
    } catch (error) {
      console.error('Error loading pattern analysis:', error);
    }
  };

  const loadPersonalizedRecommendations = async () => {
    if (!clientId) return;
    
    try {
      const response = await fetch('/api/ai/evidence-based-interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientProfile: { age: 35, primaryConcerns: ['anxiety', 'relationships'] },
          sessionHistory: []
        })
      });
      
      if (response.ok) {
        const recommendations = await response.json();
        setPersonalizedRecs(recommendations);
      }
    } catch (error) {
      console.error('Error loading personalized recommendations:', error);
    }
  };

  const loadPracticeIntelligence = async () => {
    try {
      const [efficiencyResponse, retentionResponse] = await Promise.all([
        fetch('/api/ai/session-efficiency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ therapistId, timeframe: 'month' })
        }),
        clientId ? fetch('/api/ai/client-retention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId })
        }) : Promise.resolve({ ok: false })
      ]);
      
      if (efficiencyResponse.ok) {
        const efficiency = await efficiencyResponse.json();
        let retention = null;
        
        if (retentionResponse && 'json' in retentionResponse && retentionResponse.ok) {
          retention = await retentionResponse.json();
        }
        
        setPracticeIntelligence({
          ...efficiency,
          retentionAnalysis: retention || {
            retentionRisk: { level: 'low', probability: 85, riskFactors: [], protectiveFactors: [] },
            retentionStrategies: []
          }
        });
      }
    } catch (error) {
      console.error('Error loading practice intelligence:', error);
    }
  };

  const loadTherapistInsights = async () => {
    try {
      const response = await fetch('/api/ai/therapist-strengths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapistId })
      });
      
      if (response.ok) {
        const insights = await response.json();
        setTherapistInsights(insights);
      }
    } catch (error) {
      console.error('Error loading therapist insights:', error);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="ai-intelligence-dashboard p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-lg font-medium">Loading AI Intelligence...</p>
            <p className="text-sm text-gray-500">Analyzing patterns and generating insights</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-intelligence-dashboard space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            AI Clinical Intelligence
          </h2>
          <p className="text-gray-600 mt-1">Advanced insights and predictive analytics for optimal therapeutic outcomes</p>
        </div>
        <Button onClick={loadAIIntelligence} disabled={isLoading}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Refresh Insights
        </Button>
      </div>

      {/* Risk Alerts */}
      {predictiveInsights?.riskEscalationAlerts?.riskLevel !== 'low' && predictiveInsights && (
        <Alert className={`border ${predictiveInsights.riskEscalationAlerts.riskLevel === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
          <AlertTriangle className="h-4 w-4" />
          <div>
            <p className="font-medium">
              Risk Alert: {predictiveInsights.riskEscalationAlerts.riskLevel.toUpperCase()}
            </p>
            <p className="text-sm mt-1">
              {predictiveInsights.riskEscalationAlerts.earlyWarningIndicators[0]}
            </p>
          </div>
        </Alert>
      )}

      {/* Intelligence Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="personalized">Personalized</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Predictive Models Tab */}
        <TabsContent value="predictive" className="space-y-4">
          {predictiveInsights ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Treatment Outcome Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Success Probability</span>
                        <span className="text-lg font-bold text-green-600">
                          {predictiveInsights.treatmentOutcomePrediction.successProbability}%
                        </span>
                      </div>
                      <Progress value={predictiveInsights.treatmentOutcomePrediction.successProbability} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Success Factors</p>
                        <ul className="space-y-1">
                          {predictiveInsights.treatmentOutcomePrediction.keySuccessFactors?.map((factor, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {factor}
                            </li>
                          )) || []}
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Potential Barriers</p>
                        <ul className="space-y-1">
                          {predictiveInsights.treatmentOutcomePrediction.potentialBarriers?.map((barrier, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              {barrier}
                            </li>
                          )) || []}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm">
                        <strong>Estimated sessions to goal:</strong> {predictiveInsights.treatmentOutcomePrediction.estimatedSessionsToGoal} sessions
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Confidence:</strong> {predictiveInsights.treatmentOutcomePrediction.confidenceLevel}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Optimal Intervention Timing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Phase</span>
                      <Badge>{predictiveInsights.optimalInterventionTiming.currentPhase}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ready for Advanced Techniques</span>
                      <Badge className={predictiveInsights.optimalInterventionTiming.readinessForAdvancedTechniques ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {predictiveInsights.optimalInterventionTiming.readinessForAdvancedTechniques ? 'Yes' : 'Not Yet'}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommended Next Interventions</p>
                      <ul className="space-y-1">
                        {predictiveInsights.optimalInterventionTiming.recommendedNextInterventions?.map((intervention, index) => (
                          <li key={index} className="text-sm p-2 bg-purple-50 rounded">
                            {intervention}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Select a client to view predictive insights</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pattern Recognition Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {patternAnalysis ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Successful Intervention Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.successfulInterventionPatterns?.map((pattern, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{pattern.pattern}</h4>
                          <Badge className="bg-green-100 text-green-800">
                            {pattern.successRate}% success rate
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Optimal timing: {pattern.optimalTiming}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {pattern.clientTypes?.map((type, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Breakthrough Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {patternAnalysis.breakthroughIndicators?.map((indicator, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{indicator}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Loading pattern analysis...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Personalized Recommendations Tab */}
        <TabsContent value="personalized" className="space-y-4">
          {personalizedRecs ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evidence-Based Modality Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {personalizedRecs.primaryModalities?.map((modality, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{modality.approach}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              modality.evidenceLevel === 'strong' ? 'bg-green-100 text-green-800' :
                              modality.evidenceLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {modality.evidenceLevel} evidence
                            </Badge>
                            <span className="text-sm font-medium">{modality.suitabilityScore}/10</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{modality.rationale}</p>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Specific Techniques:</p>
                          <ul className="text-sm space-y-1">
                            {modality.specificTechniques?.map((technique, idx) => (
                              <li key={idx} className="text-gray-600">• {technique}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {personalizedRecs.contraindications?.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-800">Important Contraindications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {personalizedRecs.contraindications?.map((contraindication, index) => (
                        <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          {contraindication}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Select a client to view personalized recommendations</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Practice Intelligence Tab */}
        <TabsContent value="practice" className="space-y-4">
          {practiceIntelligence ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Session Efficiency Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {practiceIntelligence.currentEfficiencyMetrics.sessionUtilization}%
                      </div>
                      <p className="text-sm text-gray-600">Session Utilization</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {practiceIntelligence.currentEfficiencyMetrics.progressPerSession}/10
                      </div>
                      <p className="text-sm text-gray-600">Progress Per Session</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {practiceIntelligence.currentEfficiencyMetrics.clientSatisfactionIndicators.length}
                      </div>
                      <p className="text-sm text-gray-600">Satisfaction Indicators</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {practiceIntelligence.optimizationOpportunities?.map((opportunity, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-1">{opportunity.area}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Current:</strong> {opportunity.currentState}
                        </p>
                        <p className="text-sm text-blue-700 mb-2">
                          <strong>Recommendation:</strong> {opportunity.recommendation}
                        </p>
                        <p className="text-sm text-green-700">
                          <strong>Expected Improvement:</strong> {opportunity.expectedImprovement}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {clientId && practiceIntelligence.retentionAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Client Retention Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Retention Risk Level</span>
                        <Badge className={getRiskColor(practiceIntelligence.retentionAnalysis.retentionRisk.level)}>
                          {practiceIntelligence.retentionAnalysis.retentionRisk.level}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Retention Probability</span>
                        <span className="text-lg font-bold text-green-600">
                          {practiceIntelligence.retentionAnalysis.retentionRisk.probability}%
                        </span>
                      </div>

                      {practiceIntelligence.retentionAnalysis.retentionStrategies?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Retention Strategies</p>
                          {practiceIntelligence.retentionAnalysis.retentionStrategies?.map((strategy, index) => (
                            <div key={index} className="text-sm p-2 bg-indigo-50 rounded-lg mb-2">
                              <p className="font-medium">{strategy.strategy}</p>
                              <p className="text-gray-600">{strategy.rationale}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Loading practice intelligence...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Therapist Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {therapistInsights ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-600" />
                    Clinical Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {therapistInsights.clinicalStrengths?.map((strength, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{strength.strength}</h4>
                          <div className="text-sm font-medium text-green-600">
                            {strength.effectiveness}/10 effectiveness
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{strength.evidenceBase}</p>
                        <div className="flex flex-wrap gap-1">
                          {strength.clientTypes?.map((type, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Professional Development
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {therapistInsights.professionalGrowthAreas?.map((area, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-1">{area.area}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Current Level:</strong> {area.currentLevel}
                        </p>
                        <p className="text-sm text-blue-700 mb-2">
                          <strong>Development Opportunity:</strong> {area.developmentOpportunity}
                        </p>
                        <div>
                          <p className="text-sm font-medium mb-1">Recommended Resources:</p>
                          <ul className="text-sm space-y-1">
                            {area.resources?.map((resource, idx) => (
                              <li key={idx} className="text-gray-600">• {resource}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Your Therapeutic Niche
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Practice Specialization</p>
                      <p className="text-lg font-medium text-purple-700">{therapistInsights.practiceNiche}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Your Unique Therapeutic Gifts</p>
                      <div className="flex flex-wrap gap-2">
                        {therapistInsights.uniqueTherapeuticGifts?.map((gift, index) => (
                          <Badge key={index} className="bg-purple-100 text-purple-800">
                            {gift}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Areas of Excellence</p>
                      <div className="flex flex-wrap gap-2">
                        {therapistInsights.specializations?.map((spec, index) => (
                          <Badge key={index} className="bg-blue-100 text-blue-800">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-500">Loading therapist insights...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}