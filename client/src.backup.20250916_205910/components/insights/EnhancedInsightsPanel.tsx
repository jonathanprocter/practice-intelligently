import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle, Brain, Target, TrendingUp, FileText, Users, Calendar } from 'lucide-react';
import type { ActionItem } from '../../../shared/schema';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
}

interface EnhancedInsightsProps {
  insights: {
    summary: string;
    clinicalAssessment: {
      moodState: string;
      behavioralObservations: string[];
      cognitivePatterns: string[];
      riskFactors: string[];
      progressMarkers: string[];
    };
    therapeuticRecommendations: {
      interventions: string[];
      homeworkAssignments: string[];
      resourceRecommendations: string[];
      nextSessionFocus: string[];
    };
    longitudinalAnalysis: {
      progressTrends: string[];
      patternRecognition: string[];
      goalAlignment: string[];
      treatmentAdjustments: string[];
    };
    followUpActions: {
      immediateActions: { action: string; priority: 'high' | 'medium' | 'low'; dueDate: string }[];
      longTermGoals: string[];
      referralConsiderations: string[];
    };
    riskAssessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      mitigation: string[];
      monitoringNeeds: string[];
    };
    suggestedQuestions: {
      explorative: string[];
      therapeutic: string[];
      assessmentBased: string[];
    };
  };
  onSaveInsights: () => void;
  onGenerateProgressReport: () => void;
  onCreateActionItems: (actions: ActionItem[]) => void;
}

export function EnhancedInsightsPanel({ 
  insights, 
  onSaveInsights, 
  onGenerateProgressReport,
  onCreateActionItems 
}: EnhancedInsightsProps) {
  const [activeTab, setActiveTab] = useState('clinical');

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCreateActionItems = () => {
    const actionItems = insights.followUpActions.immediateActions.map(action => ({
      title: action.action,
      priority: action.priority,
      dueDate: action.dueDate,
      type: 'clinical-followup'
    }));
    onCreateActionItems(actionItems);
  };

  return (
    <div className="enhanced-insights-panel space-y-6">
      {/* Header with Summary and Risk Alert */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Enhanced AI Clinical Insights
          </h3>
          <div className="flex gap-2">
            <Button onClick={onGenerateProgressReport} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Progress Report
            </Button>
            <Button onClick={onSaveInsights} size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Save Insights
            </Button>
          </div>
        </div>

        {/* Risk Assessment Alert */}
        {insights.riskAssessment.level !== 'low' && (
          <Alert className={`border ${insights.riskAssessment.level === 'high' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Risk Assessment: {insights.riskAssessment.level.toUpperCase()}</p>
              <p className="text-sm mt-1">
                {insights.riskAssessment.factors.length > 0 && insights.riskAssessment.factors[0]}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Executive Summary */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">{insights.summary}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="therapeutic">Therapeutic</TabsTrigger>
          <TabsTrigger value="longitudinal">Progress</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>

        {/* Clinical Assessment Tab */}
        <TabsContent value="clinical" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Mood State</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="mb-2">{insights.clinicalAssessment.moodState}</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Behavioral Observations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights.clinicalAssessment.behavioralObservations.map((obs, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {obs}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cognitive Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights.clinicalAssessment.cognitivePatterns.map((pattern, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      {pattern}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {insights.clinicalAssessment.riskFactors.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-base text-orange-800">Risk Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {insights.clinicalAssessment.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm flex items-start gap-2 text-orange-700">
                        <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Therapeutic Recommendations Tab */}
        <TabsContent value="therapeutic" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommended Interventions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.therapeuticRecommendations.interventions.map((intervention, index) => (
                    <li key={index} className="text-sm p-2 bg-blue-50 rounded-lg">
                      {intervention}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Homework Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.therapeuticRecommendations.homeworkAssignments.map((assignment, index) => (
                    <li key={index} className="text-sm p-2 bg-green-50 rounded-lg">
                      {assignment}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resource Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights.therapeuticRecommendations.resourceRecommendations.map((resource, index) => (
                    <li key={index} className="text-sm">• {resource}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Longitudinal Analysis Tab */}
        <TabsContent value="longitudinal" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.longitudinalAnalysis.progressTrends.map((trend, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{trend}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pattern Recognition</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights.longitudinalAnalysis.patternRecognition.map((pattern, index) => (
                    <li key={index} className="text-sm">🔍 {pattern}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Follow-up Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Immediate Actions</h4>
            <Button onClick={handleCreateActionItems} size="sm" variant="outline">
              <Target className="w-4 h-4 mr-2" />
              Create Action Items
            </Button>
          </div>

          <div className="space-y-3">
            {insights.followUpActions.immediateActions.map((action, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.action}</p>
                      <p className="text-xs text-gray-500 mt-1">Due: {action.dueDate}</p>
                    </div>
                    <Badge className={`${getPriorityColor(action.priority)} text-white`}>
                      {action.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {insights.followUpActions.longTermGoals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Long-term Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights.followUpActions.longTermGoals.map((goal, index) => (
                    <li key={index} className="text-sm">🎯 {goal}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Suggested Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Explorative Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.suggestedQuestions.explorative.map((question, index) => (
                    <li key={index} className="text-sm p-2 bg-purple-50 rounded-lg">
                      ❓ {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Therapeutic Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.suggestedQuestions.therapeutic.map((question, index) => (
                    <li key={index} className="text-sm p-2 bg-blue-50 rounded-lg">
                      💭 {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assessment Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.suggestedQuestions.assessmentBased.map((question, index) => (
                    <li key={index} className="text-sm p-2 bg-green-50 rounded-lg">
                      📊 {question}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}