export interface TroubleshootingTree {
  id: string;
  title: string;
  descriptionForAi: string;
  isActive: boolean;
  createdAt: string;
  treeJsonContent: TreeContent;
}

export interface TreeContent {
  startNode: string;
  nodes: { [key: string]: TreeNode };  
}

export interface TreeNode {
  text: string;
  options: TreeOption[];
}

export interface TreeOption {
  label: string;
  next?: string;       
  action?: 'RESOLVED' | 'CREATE_TICKET';  
}

 export interface AiAnalysisResponse {
  treeId: string;
}