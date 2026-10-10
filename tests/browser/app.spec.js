import {test,expect} from '@playwright/test';
test('sample, filtering, removal and complete downloadable report',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Try the sample dataset'}).click();
 await expect(page.locator('#finding-count')).toHaveText('7 findings across 4 records');
 await page.getByLabel('Flagged records only').check();await expect(page.locator('#preview tbody tr')).toHaveCount(4);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download JSON report'}).click()]);
 const stream=await download.createReadStream();let content='';for await(const chunk of stream)content+=chunk;
 const report=JSON.parse(content);expect(report.issues).toHaveLength(7);expect(report.rowCount).toBe(6);
 await page.getByRole('button',{name:'Remove unique check for order_id'}).click();await expect(page.locator('#finding-count')).toHaveText('5 findings across 4 records');
});
test('upload, add range rule, invalid file preserves existing data and escapes HTML',async({page})=>{
 await page.goto('/');await page.locator('#file').setInputFiles({name:'custom.csv',mimeType:'text/csv',buffer:Buffer.from('amount,note\n2,<img src=x onerror=alert(1)>\n12,ok')});
 await page.locator('#kind').selectOption('range');await page.locator('#max').fill('10');await page.getByRole('button',{name:'Add check'}).click();
 await expect(page.locator('#finding-count')).toHaveText('1 findings across 1 records');await expect(page.locator('#preview img')).toHaveCount(0);
 await page.locator('#file').setInputFiles({name:'broken.csv',mimeType:'text/csv',buffer:Buffer.from('a,b\n1')});
 await expect(page.getByRole('alert')).toContainText('not loaded');await expect(page.locator('#filename')).toHaveText('custom.csv');
});
test('pagination and empty flagged filter work',async({page})=>{
 await page.goto('/');await page.locator('#file').setInputFiles({name:'many.csv',mimeType:'text/csv',buffer:Buffer.from('id\n'+Array.from({length:101},(_,i)=>i).join('\n'))});
 await expect(page.locator('#preview tbody tr')).toHaveCount(50);await page.getByRole('button',{name:'Next'}).click();await expect(page.locator('#page-label')).toContainText('Page 2 of 3');
 await page.getByLabel('Flagged records only').check();await expect(page.locator('#preview')).toContainText('No records to display.');await expect(page.getByRole('button',{name:'Next'})).toBeDisabled();
});
test('mobile layout stays within viewport and controls work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Try the sample dataset'}).click();await expect(page.locator('#filename')).toHaveText('sample-orders.csv');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/mobile.png',fullPage:true});
});
