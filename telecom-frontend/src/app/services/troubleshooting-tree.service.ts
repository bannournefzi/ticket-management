import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TroubleshootingTree, AiAnalysisResponse } from '../models/troubleshooting-tree.model';

@Injectable({
  providedIn: 'root'
})
export class TroubleshootingTreeService {
  
   private apiUrl = 'http://localhost:8088/api/v1/troubleshooting-trees';

  constructor(private http: HttpClient) {}

   analyzeProblem(userDescription: string): Observable<AiAnalysisResponse> {
    return this.http.post<AiAnalysisResponse>(`${this.apiUrl}/analyze-problem`, { userDescription });
  }

   getTreeById(id: string): Observable<TroubleshootingTree> {
    return this.http.get<TroubleshootingTree>(`${this.apiUrl}/${id}`);
  }
}