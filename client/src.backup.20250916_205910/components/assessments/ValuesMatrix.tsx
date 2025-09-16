import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Share2, RotateCcw, Save, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ValuesMatrixProps {
  clientId?: string;
  onComplete?: (results: ValuesResults) => void;
}

interface ValuesResults {
  values: string[];
  rankings: { value: string; score: number; rank: number }[];
  comparisons: { valueA: string; valueB: string; winner: string }[];
  coreValues: string[];
  growthValues: string[];
}

export function ValuesMatrix({ clientId, onComplete }: ValuesMatrixProps) {
  const [step, setStep] = useState<'input' | 'compare' | 'results'>('input');
  const [values, setValues] = useState<string[]>(Array(10).fill(''));
  const [currentComparison, setCurrentComparison] = useState(0);
  const [comparisons, setComparisons] = useState<{ valueA: string; valueB: string; winner: string }[]>([]);
  const [results, setResults] = useState<ValuesResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate all possible pairwise comparisons (45 total for 10 values)
  const generateComparisons = (valuesList: string[]) => {
    const pairs: { valueA: string; valueB: string }[] = [];
    for (let i = 0; i < valuesList.length; i++) {
      for (let j = i + 1; j < valuesList.length; j++) {
        pairs.push({ valueA: valuesList[i], valueB: valuesList[j] });
      }
    }
    return pairs;
  };

  const allComparisons = values.filter(v => v.trim()).length === 10 
    ? generateComparisons(values.filter(v => v.trim()))
    : [];

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const startComparison = () => {
    const filledValues = values.filter(v => v.trim());
    if (filledValues.length !== 10) {
      toast({
        title: "Please fill all 10 values",
        description: "All value fields must be completed before starting comparisons.",
        variant: "destructive"
      });
      return;
    }
    setStep('compare');
    setCurrentComparison(0);
    setComparisons([]);
  };

  const handleComparison = (winner: string) => {
    const currentPair = allComparisons[currentComparison];
    if (!currentPair) return; // Safety check
    
    const newComparison = {
      valueA: currentPair.valueA,
      valueB: currentPair.valueB,
      winner
    };
    
    const newComparisons = [...comparisons, newComparison];
    setComparisons(newComparisons);

    if (currentComparison < allComparisons.length - 1) {
      setCurrentComparison(currentComparison + 1);
    } else {
      // All comparisons complete, calculate results
      calculateResults(newComparisons);
    }
  };

  const calculateResults = (allComparisons: { valueA: string; valueB: string; winner: string }[]) => {
    setIsLoading(true);
    
    // Calculate scores for each value based on wins
    const filledValues = values.filter(v => v.trim());
    const scores: { [key: string]: number } = {};
    
    // Initialize scores
    filledValues.forEach(value => {
      scores[value] = 0;
    });

    // Count wins for each value
    allComparisons.forEach(comparison => {
      scores[comparison.winner]++;
    });

    // Create rankings
    const rankings = filledValues.map(value => ({
      value,
      score: scores[value],
      rank: 0
    })).sort((a, b) => b.score - a.score);

    // Assign ranks
    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Separate core values (top 5) and growth values (6-10)
    const coreValues = rankings.slice(0, 5).map(r => r.value);
    const growthValues = rankings.slice(5).map(r => r.value);

    const finalResults: ValuesResults = {
      values: filledValues,
      rankings,
      comparisons: allComparisons,
      coreValues,
      growthValues
    };

    setResults(finalResults);
    setStep('results');
    setIsLoading(false);

    // Call completion callback if provided
    if (onComplete) {
      onComplete(finalResults);
    }
  };

  const exportResults = (format: 'pdf' | 'text') => {
    if (!results) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      clientId,
      coreValues: results.coreValues,
      growthValues: results.growthValues,
      fullRankings: results.rankings,
      totalComparisons: results.comparisons.length
    };

    if (format === 'text') {
      const textContent = `Values Matrix Results - ${new Date().toLocaleDateString()}

Core Guiding Values (Top 5):
${results.coreValues.map((value, index) => `${index + 1}. ${value}`).join('\n')}

Growth Values (6-10):
${results.growthValues.map((value, index) => `${index + 6}. ${value}`).join('\n')}

Complete Rankings:
${results.rankings.map(r => `${r.rank}. ${r.value} (${r.score} wins)`).join('\n')}
`;

      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `values-matrix-results-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Results exported successfully",
      description: `Values Matrix results exported as ${format.toUpperCase()}`
    });
  };

  const saveProgress = () => {
    const progressData = {
      step,
      values,
      currentComparison,
      comparisons,
      results,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('valuesMatrixProgress', JSON.stringify(progressData));
    toast({
      title: "Progress saved",
      description: "Your progress has been saved locally"
    });
  };

  const loadProgress = () => {
    const saved = localStorage.getItem('valuesMatrixProgress');
    if (saved) {
      try {
        const progressData = JSON.parse(saved);
        setStep(progressData.step);
        setValues(progressData.values);
        setCurrentComparison(progressData.currentComparison);
        setComparisons(progressData.comparisons);
        setResults(progressData.results);
        toast({
          title: "Progress loaded",
          description: "Your saved progress has been restored"
        });
      } catch (error) {
        toast({
          title: "Failed to load progress",
          description: "Unable to restore saved progress",
          variant: "destructive"
        });
      }
    }
  };

  const resetTool = () => {
    setStep('input');
    setValues(Array(10).fill(''));
    setCurrentComparison(0);
    setComparisons([]);
    setResults(null);
    localStorage.removeItem('valuesMatrixProgress');
    toast({
      title: "Tool reset",
      description: "Values Matrix has been reset to start over"
    });
  };

  if (step === 'input') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Values Matrix Assessment
              <Badge variant="secondary">Step 1 of 3</Badge>
            </CardTitle>
            <CardDescription>
              Enter 10 personal values that are important to you. These will be compared against each other to determine your value hierarchy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {values.map((value, index) => (
                <div key={index} className="space-y-2">
                  <label className="text-sm font-medium">Value {index + 1}</label>
                  <Input
                    data-testid={`input-value-${index + 1}`}
                    placeholder={index === 0 ? "e.g., Family" : index === 1 ? "e.g., Career Growth" : `Enter value ${index + 1}`}
                    value={value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="flex flex-wrap gap-2">
              <Button 
                data-testid="button-start-comparison"
                onClick={startComparison}
                disabled={values.filter(v => v.trim()).length < 10}
                className="flex-1 min-w-48"
              >
                Start Comparison
              </Button>
              <Button variant="outline" onClick={saveProgress}>
                <Save className="w-4 h-4 mr-2" />
                Save Progress
              </Button>
              <Button variant="outline" onClick={loadProgress}>
                <Upload className="w-4 h-4 mr-2" />
                Load Saved
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'compare') {
    const progress = ((currentComparison) / allComparisons.length) * 100;
    const currentPair = allComparisons[currentComparison];

    if (!currentPair) {
      return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p>No comparisons available. Please return to Step 1.</p>
              <Button onClick={() => setStep('input')} className="mt-4">
                Back to Values Input
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Compare Your Values
              <Badge variant="secondary">Step 2 of 3</Badge>
            </CardTitle>
            <CardDescription>
              Choose which value is more important to you in each pair. {allComparisons.length - currentComparison} comparisons remaining.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{currentComparison} of {allComparisons.length}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Which is more important to you?</h3>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Button
                  data-testid={`button-choose-value-a`}
                  variant="outline"
                  size="lg"
                  onClick={() => handleComparison(currentPair.valueA)}
                  className="w-full md:w-48 h-20 text-lg font-medium"
                >
                  {currentPair.valueA}
                </Button>
                
                <div className="text-muted-foreground font-medium">vs</div>
                
                <Button
                  data-testid={`button-choose-value-b`}
                  variant="outline"
                  size="lg"
                  onClick={() => handleComparison(currentPair.valueB)}
                  className="w-full md:w-48 h-20 text-lg font-medium"
                >
                  {currentPair.valueB}
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentComparison(Math.max(0, currentComparison - 1))}
                disabled={currentComparison === 0}
              >
                Previous
              </Button>
              <Button variant="ghost" onClick={saveProgress}>
                Save Progress
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'results' && results) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Your Values Ranking
              <Badge variant="secondary">Results</Badge>
            </CardTitle>
            <CardDescription>
              Based on your comparisons, here are your values ranked by importance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Core Values */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                Core Guiding Values (Top 5)
              </h3>
              <p className="text-sm text-muted-foreground">
                These values represent your fundamental priorities and should guide major life decisions.
              </p>
              <div className="space-y-2">
                {results.coreValues.map((value, index) => {
                  const ranking = results.rankings.find(r => r.value === value);
                  return (
                    <div key={value} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Badge variant="default" className="bg-green-600">
                        {index + 1}
                      </Badge>
                      <span className="font-medium flex-1">{value}</span>
                      <span className="text-sm text-muted-foreground">
                        {ranking?.score} wins
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Growth Values */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                Growth Values (6-10)
              </h3>
              <p className="text-sm text-muted-foreground">
                These values represent areas for potential growth and development.
              </p>
              <div className="space-y-2">
                {results.growthValues.map((value, index) => {
                  const ranking = results.rankings.find(r => r.value === value);
                  return (
                    <div key={value} className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {index + 6}
                      </Badge>
                      <span className="font-medium flex-1">{value}</span>
                      <span className="text-sm text-muted-foreground">
                        {ranking?.score} wins
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                data-testid="button-export-text"
                onClick={() => exportResults('text')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export as Text
              </Button>
              <Button variant="outline" onClick={() => exportResults('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
              <Button variant="outline" onClick={resetTool}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}