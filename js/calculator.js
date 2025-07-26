// 副業損益バランサー計算機能

// UI制御関数
function showCalculator() {
    hideAllSections();
    document.getElementById('calculator').style.display = 'block';
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

function hideCalculator() {
    document.getElementById('calculator').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.body.scrollIntoView({ behavior: 'smooth' });
}

function showResults() {
    document.getElementById('results').style.display = 'block';
}

function showROIDashboard() {
    hideAllSections();
    document.getElementById('roi-dashboard').style.display = 'block';
    document.getElementById('roi-dashboard').scrollIntoView({ behavior: 'smooth' });
}

function hideROIDashboard() {
    document.getElementById('roi-dashboard').style.display = 'none';
    document.getElementById('roiResults').style.display = 'none';
    document.body.scrollIntoView({ behavior: 'smooth' });
}

function hideAllSections() {
    document.getElementById('calculator').style.display = 'none';
    document.getElementById('roi-dashboard').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('roiResults').style.display = 'none';
}

// 税額計算の基本レート（2024年度）
const TAX_RATES = {
    // 所得税率（累進課税）
    incomeTax: [
        { min: 0, max: 1950000, rate: 0.05, deduction: 0 },
        { min: 1950000, max: 3300000, rate: 0.10, deduction: 97500 },
        { min: 3300000, max: 6950000, rate: 0.20, deduction: 427500 },
        { min: 6950000, max: 9000000, rate: 0.23, deduction: 636000 },
        { min: 9000000, max: 18000000, rate: 0.33, deduction: 1536000 },
        { min: 18000000, max: 40000000, rate: 0.40, deduction: 2796000 },
        { min: 40000000, max: Infinity, rate: 0.45, deduction: 4796000 }
    ],
    
    // 住民税率（所得割）
    residentTax: 0.10, // 10%（市民税6% + 県民税4%）
    
    // 社会保険料率（給与所得者）
    socialInsurance: {
        health: 0.0991, // 健康保険料（協会けんぽ東京都）
        pension: 0.183, // 厚生年金保険料
        employment: 0.003, // 雇用保険料（一般事業）
        longTermCare: 0.0127 // 介護保険料（40歳以上）
    }
};

// 控除額
const DEDUCTIONS = {
    basic: 480000, // 基礎控除
    salary: 550000, // 給与所得控除（最低額）
    residentTaxBasic: 430000, // 住民税基礎控除
    socialInsuranceMax: 1740000 // 社会保険料の上限（年収）
};

// 数値フォーマット関数
function formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatPercentage(rate) {
    return (rate * 100).toFixed(1) + '%';
}

// 所得税計算
function calculateIncomeTax(taxableIncome) {
    for (let bracket of TAX_RATES.incomeTax) {
        if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
            return Math.max(0, taxableIncome * bracket.rate - bracket.deduction);
        }
    }
    return 0;
}

// 住民税計算
function calculateResidentTax(taxableIncome) {
    const taxableAmount = Math.max(0, taxableIncome - DEDUCTIONS.residentTaxBasic);
    return taxableAmount * TAX_RATES.residentTax + 5000; // 均等割5000円
}

// 社会保険料計算（給与所得分のみ）
function calculateSocialInsurance(salary) {
    const rates = TAX_RATES.socialInsurance;
    const insurableIncome = Math.min(salary, DEDUCTIONS.socialInsuranceMax);
    
    return {
        health: insurableIncome * (rates.health / 2), // 労使折半
        pension: insurableIncome * (rates.pension / 2), // 労使折半
        employment: salary * rates.employment,
        longTermCare: salary > 0 ? insurableIncome * (rates.longTermCare / 2) : 0,
        total: function() {
            return this.health + this.pension + this.employment + this.longTermCare;
        }
    };
}

// 給与所得控除計算
function calculateSalaryDeduction(salary) {
    if (salary <= 1625000) return 550000;
    if (salary <= 1800000) return salary * 0.4 - 100000;
    if (salary <= 3600000) return salary * 0.3 + 80000;
    if (salary <= 6600000) return salary * 0.2 + 440000;
    if (salary <= 8500000) return salary * 0.1 + 1100000;
    return 1950000; // 上限
}

// メイン計算関数
function calculateTax(salary, sideIncome, expenses) {
    // 給与所得の計算
    const salaryDeduction = calculateSalaryDeduction(salary);
    const salaryTaxableIncome = Math.max(0, salary - salaryDeduction);
    
    // 副業所得の計算（事業所得として計算）
    const sideTaxableIncome = Math.max(0, sideIncome - expenses);
    
    // 合算所得
    const totalTaxableIncome = salaryTaxableIncome + sideTaxableIncome;
    const adjustedTaxableIncome = Math.max(0, totalTaxableIncome - DEDUCTIONS.basic);
    
    // 税額計算
    const incomeTax = calculateIncomeTax(adjustedTaxableIncome);
    const residentTax = calculateResidentTax(totalTaxableIncome);
    const socialInsurance = calculateSocialInsurance(salary);
    
    // 副業なしの場合の計算
    const salaryOnlyTaxableIncome = Math.max(0, salaryTaxableIncome - DEDUCTIONS.basic);
    const salaryOnlyIncomeTax = calculateIncomeTax(salaryOnlyTaxableIncome);
    const salaryOnlyResidentTax = calculateResidentTax(salaryTaxableIncome);
    
    return {
        totalIncome: salary + sideIncome,
        netIncome: salary + sideIncome - incomeTax - residentTax - socialInsurance.total(),
        incomeTax: incomeTax,
        residentTax: residentTax,
        socialInsurance: socialInsurance.total(),
        totalTax: incomeTax + residentTax + socialInsurance.total(),
        
        // 比較データ
        comparison: {
            salaryOnlyTax: salaryOnlyIncomeTax + salaryOnlyResidentTax + socialInsurance.total(),
            additionalTax: (incomeTax + residentTax) - (salaryOnlyIncomeTax + salaryOnlyResidentTax),
            netIncrease: sideTaxableIncome - ((incomeTax + residentTax) - (salaryOnlyIncomeTax + salaryOnlyResidentTax)),
            roi: sideIncome > 0 ? ((sideTaxableIncome - ((incomeTax + residentTax) - (salaryOnlyIncomeTax + salaryOnlyResidentTax))) / sideIncome) : 0
        }
    };
}

// ROI分析関数
function calculateROI(salary, sideIncome, expenses, timeInvested, initialInvestment) {
    // 税務計算
    const taxResult = calculateTax(salary, sideIncome, expenses);
    
    // 基本指標計算
    const grossProfit = sideIncome - expenses;
    const netProfit = grossProfit - taxResult.comparison.additionalTax;
    const totalInvestment = initialInvestment + expenses;
    const yearlyHours = timeInvested * 12;
    
    // ROI計算
    const totalROI = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
    const hourlyRate = yearlyHours > 0 ? grossProfit / yearlyHours : 0;
    const realHourlyRate = yearlyHours > 0 ? netProfit / yearlyHours : 0;
    const netProfitMargin = sideIncome > 0 ? (netProfit / sideIncome) * 100 : 0;
    const paybackPeriod = netProfit > 0 ? Math.ceil(totalInvestment / (netProfit / 12)) : 0;
    
    // 効率性スコア計算（100点満点）
    let efficiencyScore = 0;
    if (realHourlyRate >= 3000) efficiencyScore += 30;
    else if (realHourlyRate >= 2000) efficiencyScore += 20;
    else if (realHourlyRate >= 1000) efficiencyScore += 10;
    
    if (netProfitMargin >= 50) efficiencyScore += 30;
    else if (netProfitMargin >= 30) efficiencyScore += 20;
    else if (netProfitMargin >= 10) efficiencyScore += 10;
    
    if (totalROI >= 50) efficiencyScore += 25;
    else if (totalROI >= 30) efficiencyScore += 15;
    else if (totalROI >= 10) efficiencyScore += 5;
    
    if (paybackPeriod <= 12) efficiencyScore += 15;
    else if (paybackPeriod <= 24) efficiencyScore += 10;
    else if (paybackPeriod <= 36) efficiencyScore += 5;
    
    // 改善提案生成
    const suggestions = generateROISuggestions({
        totalROI, hourlyRate, realHourlyRate, netProfitMargin, 
        paybackPeriod, efficiencyScore, expenses, sideIncome
    });
    
    return {
        totalROI,
        hourlyRate,
        realHourlyRate,
        netProfitMargin,
        paybackPeriod,
        efficiencyScore,
        grossProfit,
        netProfit,
        totalInvestment,
        yearlyHours,
        monthlyHours: timeInvested,
        taxBurden: taxResult.comparison.additionalTax,
        suggestions,
        taxResult
    };
}

// ROI改善提案生成
function generateROISuggestions(metrics) {
    const suggestions = [];
    
    if (metrics.realHourlyRate < 1000) {
        suggestions.push("🕐 時間単価が低いです。より高単価な案件への移行を検討しましょう");
    }
    
    if (metrics.netProfitMargin < 20) {
        suggestions.push("💰 利益率が低いです。経費の見直しや価格設定の最適化を行いましょう");
    }
    
    if (metrics.totalROI < 20) {
        suggestions.push("📈 ROIが低いです。初期投資の回収方法を見直しましょう");
    }
    
    if (metrics.paybackPeriod > 24) {
        suggestions.push("⏱️ 投資回収期間が長いです。収益性の高い業務に集中しましょう");
    }
    
    if (metrics.expenses / metrics.sideIncome > 0.3) {
        suggestions.push("💸 経費率が高いです。不要な支出を削減できないか検討しましょう");
    }
    
    if (metrics.efficiencyScore >= 80) {
        suggestions.push("🎉 素晴らしい効率性です！この調子で事業を拡大しましょう");
    } else if (metrics.efficiencyScore >= 60) {
        suggestions.push("👍 良好な効率性です。さらなる最適化を目指しましょう");
    }
    
    return suggestions;
}

// フォーム送信処理
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('taxForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 入力値の取得
        const salary = parseInt(document.getElementById('salary').value) || 0;
        const sideIncome = parseInt(document.getElementById('sideIncome').value) || 0;
        const expenses = parseInt(document.getElementById('expenses').value) || 0;
        
        // バリデーション
        if (salary < 0 || sideIncome < 0 || expenses < 0) {
            alert('正の数値を入力してください');
            return;
        }
        
        if (expenses > sideIncome) {
            alert('経費は副業収入以下で入力してください');
            return;
        }
        
        // 計算実行
        const result = calculateTax(salary, sideIncome, expenses);
        
        // 結果表示
        document.getElementById('totalIncome').textContent = formatCurrency(result.totalIncome);
        document.getElementById('netIncome').textContent = formatCurrency(result.netIncome);
        document.getElementById('incomeTax').textContent = formatCurrency(result.incomeTax);
        document.getElementById('residentTax').textContent = formatCurrency(result.residentTax);
        document.getElementById('socialInsurance').textContent = formatCurrency(result.socialInsurance);
        document.getElementById('totalTax').textContent = formatCurrency(result.totalTax);
        
        // 比較データ表示
        document.getElementById('additionalTax').textContent = formatCurrency(result.comparison.additionalTax);
        document.getElementById('netIncrease').textContent = formatCurrency(result.comparison.netIncrease);
        document.getElementById('roi').textContent = formatPercentage(result.comparison.roi);
        
        // 結果セクション表示
        showResults();
    });

    // ROIフォーム処理
    const roiForm = document.getElementById('roiForm');
    if (roiForm) {
        roiForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 入力値の取得
            const salary = parseInt(document.getElementById('roiSalary').value) || 0;
            const sideIncome = parseInt(document.getElementById('roiSideIncome').value) || 0;
            const expenses = parseInt(document.getElementById('roiExpenses').value) || 0;
            const timeInvested = parseInt(document.getElementById('roiTimeInvested').value) || 0;
            const initialInvestment = parseInt(document.getElementById('roiInitialInvestment').value) || 0;
            
            // バリデーション
            if (salary < 0 || sideIncome < 0 || expenses < 0 || timeInvested < 0 || initialInvestment < 0) {
                alert('正の数値を入力してください');
                return;
            }
            
            if (expenses > sideIncome) {
                alert('経費は副業収入以下で入力してください');
                return;
            }
            
            if (timeInvested === 0) {
                alert('投下時間を入力してください');
                return;
            }
            
            // ROI計算実行
            const roiResult = calculateROI(salary, sideIncome, expenses, timeInvested, initialInvestment);
            
            // 結果表示
            updateROIDisplay(roiResult);
            
            // 結果セクション表示
            document.getElementById('roiResults').style.display = 'block';
            document.getElementById('roiResults').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// ROI結果表示更新
function updateROIDisplay(result) {
    // メトリクス表示
    document.getElementById('totalROI').textContent = formatPercentage(result.totalROI / 100);
    document.getElementById('hourlyRate').textContent = formatCurrency(result.hourlyRate);
    document.getElementById('netProfitMargin').textContent = formatPercentage(result.netProfitMargin / 100);
    document.getElementById('paybackPeriod').textContent = result.paybackPeriod + 'ヶ月';
    
    // 収益分析
    document.getElementById('roiTotalIncome').textContent = formatCurrency(result.taxResult.totalIncome);
    document.getElementById('roiTotalExpenses').textContent = formatCurrency(result.totalInvestment);
    document.getElementById('roiTotalTax').textContent = formatCurrency(result.taxBurden);
    document.getElementById('roiNetProfit').textContent = formatCurrency(result.netProfit);
    
    // 効率性分析
    document.getElementById('roiMonthlyHours').textContent = result.monthlyHours + '時間';
    document.getElementById('roiYearlyHours').textContent = result.yearlyHours + '時間';
    document.getElementById('roiRealHourlyRate').textContent = formatCurrency(result.realHourlyRate);
    document.getElementById('roiEfficiencyScore').textContent = Math.round(result.efficiencyScore) + '点';
    
    // 改善提案表示
    const suggestionsContainer = document.getElementById('roiSuggestions');
    if (result.suggestions.length > 0) {
        suggestionsContainer.innerHTML = result.suggestions.map(suggestion => 
            `<p class="text-gray-700 mb-2">${suggestion}</p>`
        ).join('');
    } else {
        suggestionsContainer.innerHTML = '<p class="text-green-600">📊 現在の設定は適切です！継続して成果を上げていきましょう。</p>';
    }
    
    // 簡易チャート表示（テキストベース）
    updateSimpleCharts(result);
}

// 簡易チャート更新
function updateSimpleCharts(result) {
    // ROI推移チャート（仮想データ）
    const trendChart = document.getElementById('roiTrendChart');
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    const roiValues = months.map((_, i) => Math.max(0, result.totalROI * (0.3 + 0.7 * (i + 1) / 6)));
    
    trendChart.innerHTML = `
        <div class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-600 mb-3">6ヶ月間の予想ROI推移</h4>
            ${months.map((month, i) => `
                <div class="flex items-center">
                    <span class="w-8 text-xs text-gray-500">${month}</span>
                    <div class="flex-1 bg-gray-200 rounded-full h-4 ml-2">
                        <div class="bg-green-500 h-4 rounded-full" style="width: ${Math.min(100, roiValues[i] * 2)}%"></div>
                    </div>
                    <span class="ml-2 text-xs font-semibold">${roiValues[i].toFixed(1)}%</span>
                </div>
            `).join('')}
        </div>
    `;
    
    // 収益構成比チャート
    const compositionChart = document.getElementById('roiCompositionChart');
    const totalRevenue = result.taxResult.totalIncome;
    const expenseRatio = (result.totalInvestment / totalRevenue) * 100;
    const taxRatio = (result.taxBurden / totalRevenue) * 100;
    const profitRatio = 100 - expenseRatio - taxRatio;
    
    compositionChart.innerHTML = `
        <div class="space-y-3">
            <h4 class="text-sm font-semibold text-gray-600 mb-3">収益構成比</h4>
            <div class="space-y-2">
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span class="text-sm">純利益: ${profitRatio.toFixed(1)}%</span>
                </div>
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span class="text-sm">税負担: ${taxRatio.toFixed(1)}%</span>
                </div>
                <div class="flex items-center">
                    <div class="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span class="text-sm">経費: ${expenseRatio.toFixed(1)}%</span>
                </div>
            </div>
            <div class="mt-4 bg-gray-200 rounded-full h-6">
                <div class="flex h-6 rounded-full overflow-hidden">
                    <div class="bg-green-500" style="width: ${profitRatio}%"></div>
                    <div class="bg-red-500" style="width: ${taxRatio}%"></div>
                    <div class="bg-yellow-500" style="width: ${expenseRatio}%"></div>
                </div>
            </div>
        </div>
    `;
}
});

// スムーススクロール
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});