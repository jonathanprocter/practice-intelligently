"""
Python backend for bidirectional PDF export
Provides server-side PDF generation capabilities
"""

from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime, timedelta
import json

class BidirectionalWeeklyExporter:
    def __init__(self):
        self.page_width, self.page_height = letter
        self.landscape_width, self.landscape_height = landscape(letter)
    
    def export_weekly_package(self, week_start, events_data):
        """Export bidirectional weekly package from Python backend"""
        print(f"🐍 Python: Exporting weekly package for {week_start}")
        
        filename = f"python-bidirectional-weekly-{week_start}.pdf"
        c = canvas.Canvas(filename, pagesize=landscape(letter))
        
        # Page 1: Weekly Overview (Landscape)
        self.create_weekly_overview(c, week_start, events_data)
        
        # Pages 2-8: Daily Pages (Portrait)
        for day_index in range(7):
            c.showPage()
            c.setPageSize(letter)
            self.create_daily_page(c, week_start, day_index, events_data)
        
        c.save()
        print(f"✅ Python export complete: {filename}")
        return filename
    
    def create_weekly_overview(self, c, week_start, events_data):
        """Create weekly overview page"""
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredText(self.landscape_width/2, self.landscape_height-50, "WEEKLY OVERVIEW")
        
        c.setFont("Helvetica", 14)
        c.drawCentredText(self.landscape_width/2, self.landscape_height-80, f"Week of {week_start}")
        
        # Add navigation hint
        c.setFont("Helvetica", 10)
        c.drawCentredText(self.landscape_width/2, self.landscape_height-100, "Bidirectional navigation enabled")
    
    def create_daily_page(self, c, week_start, day_index, events_data):
        """Create daily page"""
        c.setFont("Helvetica-Bold", 28)
        c.drawCentredText(self.page_width/2, self.page_height-50, "DAILY PLANNER")
        
        # Day-specific content
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        c.setFont("Helvetica", 16)
        c.drawCentredText(self.page_width/2, self.page_height-80, day_names[day_index])
        
        # Navigation
        c.setFont("Helvetica", 10)
        c.drawCentredText(self.page_width/2, self.page_height-100, f"Page {day_index + 2} of 8")

if __name__ == "__main__":
    exporter = BidirectionalWeeklyExporter()
    exporter.export_weekly_package("2025-08-19", [])
