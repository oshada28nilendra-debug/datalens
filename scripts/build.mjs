import {rm,mkdir,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const name of ['index.html','src','samples']) await cp(name,'dist/'+name,{recursive:true});
console.log('Static production bundle written to dist/');
