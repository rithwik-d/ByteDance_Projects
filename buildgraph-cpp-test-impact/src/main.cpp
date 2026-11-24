#include <algorithm>
#include <fstream>
#include <iostream>
#include <map>
#include <queue>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

using Map=std::map<std::string,std::set<std::string>>;
struct Graph {
    Map depends; // module -> modules it imports
    Map reverse; // dependency -> importing modules
    Map coverage; // test -> modules exercised
    std::set<std::string> modules;
    std::set<std::string> tests;
    size_t edges=0,coverageEdges=0;
};
static std::vector<std::string> csvRow(const std::string& s){
    std::stringstream ss(s);std::vector<std::string> v;std::string x;
    while(std::getline(ss,x,','))v.push_back(x);
    return v;
}
static Graph read(const std::string& moduleFile,const std::string& testFile){
    Graph g;std::ifstream m(moduleFile),t(testFile);if(!m||!t)throw std::runtime_error("file missing");
    std::string s;
    while(std::getline(m,s)){
        if(s.empty()||s.rfind("#",0)==0)continue;
        auto row=csvRow(s);if(s.back()==',')row.emplace_back("");if(row.size()!=2||row[0].empty())throw std::runtime_error("bad module CSV row");
        g.modules.insert(row[0]);if(!row[1].empty()){
            g.modules.insert(row[1]);
            if(g.depends[row[0]].insert(row[1]).second){g.reverse[row[1]].insert(row[0]);g.edges++;}
        }
    }
    while(std::getline(t,s)){
        if(s.empty()||s.rfind("#",0)==0)continue;
        auto row=csvRow(s);if(row.size()!=2||row[0].empty()||row[1].empty())throw std::runtime_error("bad test CSV row");
        if(!g.modules.contains(row[1]))throw std::runtime_error("coverage references unknown module: "+row[1]);
        g.tests.insert(row[0]);if(g.coverage[row[0]].insert(row[1]).second)g.coverageEdges++;
    }
    return g;
}
static std::set<std::string> affectedModules(const Graph& g,std::vector<std::string> changed){
    std::set<std::string> affected;std::queue<std::string> q;
    for(const auto &id:changed){if(!g.modules.contains(id))throw std::runtime_error("unknown module: "+id);if(affected.insert(id).second)q.push(id);}
    while(!q.empty()){
        auto current=q.front();q.pop();
        if(g.reverse.contains(current))for(const auto& downstream:g.reverse.at(current))if(affected.insert(downstream).second)q.push(downstream);
    }
    return affected;
}
static std::set<std::string> impactedTests(const Graph& g,const std::set<std::string>& affected){
    std::set<std::string> results;
    for(auto&[name,files]:g.coverage)for(auto& f:files){if(affected.contains(f)){results.insert(name);break;}}
    return results;
}
static size_t cyclesCount(const Graph& g){
    std::map<std::string,int> state;size_t backEdges=0;
    auto walk=[&](auto&&self,const std::string& name)->void{
        state[name]=1;
        if(g.depends.contains(name))for(const auto& dep:g.depends.at(name)){
            if(state[dep]==1)backEdges++;
            else if(state[dep]==0)self(self,dep);
        }
        state[name]=2;
    };
    for(const auto&name:g.modules)if(state[name]==0)walk(walk,name);
    return backEdges;
}
static void printStrings(const std::set<std::string>&v){bool first=true;for(const auto&x:v){if(!first)std::cout<<",";first=false;std::cout<<"\""<<x<<"\"";}}
int main(int argc,char**argv){
 try {
    if(argc<4)throw std::runtime_error("usage: buildgraph modules.csv tests.csv stats|impact|cycles [module ...]");
    auto g=read(argv[1],argv[2]);const std::string cmd=argv[3];
    if(cmd=="stats"){
       std::cout<<"{\"modules\":"<<g.modules.size()<<",\"tests\":"<<g.tests.size()<<",\"dependencies\":"<<g.edges<<",\"coverage_links\":"<<g.coverageEdges<<",\"back_edges\":"<<cyclesCount(g)<<"}\n";
    }else if(cmd=="cycles"){
       std::cout<<"{\"back_edges\":"<<cyclesCount(g)<<"}\n";
    }else if(cmd=="impact"){
       if(argc<5)throw std::runtime_error("at least one module required");
       std::vector<std::string> changes;for(int i=4;i<argc;i++)changes.push_back(argv[i]);
       const auto a=affectedModules(g,changes),t=impactedTests(g,a);
       std::cout<<"{\"affected_modules\":"<<a.size()<<",\"selected_test_count\":"<<t.size()<<",\"selected_tests\":[";printStrings(t);std::cout<<"]}\n";
    }else throw std::runtime_error("unsupported command");
    return 0;
 }catch(const std::exception&e){std::cerr<<"ERROR: "<<e.what()<<"\n";return 1;}
}
