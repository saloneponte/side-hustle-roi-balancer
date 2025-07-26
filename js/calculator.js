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

function showIncorporationAnalysis() {
    hideAllSections();
    document.getElementById('incorporation-analysis').style.display = 'block';
    document.getElementById('incorporation-analysis').scrollIntoView({ behavior: 'smooth' });
}

function hideIncorporationAnalysis() {
    document.getElementById('incorporation-analysis').style.display = 'none';
    document.getElementById('incorporationResults').style.display = 'none';
    document.body.scrollIntoView({ behavior: 'smooth' });
}

function hideAllSections() {
    document.getElementById('calculator').style.display = 'none';
    document.getElementById('roi-dashboard').style.display = 'none';
    document.getElementById('incorporation-analysis').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    document.getElementById('roiResults').style.display = 'none';
    document.getElementById('incorporationResults').style.display = 'none';
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
    
    // 法人税率
    corporationTax: {
        small: 0.15,        // 中小企業：年800万円以下
        large: 0.236,       // 中小企業：年800万円超、一般企業
        localTax: 0.173     // 地方法人税・住民税・事業税の合計概算
    },
    
    // 個人事業税率
    businessTax: {
        rate: 0.05,         // 5%（事業の種類による）
        deduction: 2900000  // 事業主控除290万円
    },
    
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

// 法人化分析関数
function calculateIncorporationAnalysis(data) {
    const {
        salary, businessIncome, businessExpenses, 
        desiredSalary, corporationCosts, expectedGrowth,
        considerSocialInsurance, considerRetirement
    } = data;
    
    // 個人事業主の場合の計算
    const individualAnalysis = calculateIndividualBusiness(
        salary, businessIncome, businessExpenses, considerSocialInsurance
    );
    
    // 法人の場合の計算
    const corporationAnalysis = calculateCorporation(
        businessIncome, businessExpenses, desiredSalary, 
        corporationCosts, considerSocialInsurance
    );
    
    // 分岐点の計算
    const breakEvenPoint = calculateBreakEvenPoint(
        salary, businessExpenses, corporationCosts, expectedGrowth
    );
    
    // 将来予測
    const futureProjection = calculateFutureProjection(
        businessIncome, expectedGrowth, breakEvenPoint, 5
    );
    
    // 推奨判定
    const recommendation = generateIncorporationRecommendation(
        individualAnalysis, corporationAnalysis, breakEvenPoint, businessIncome
    );
    
    return {
        individual: individualAnalysis,
        corporation: corporationAnalysis,
        breakEvenPoint,
        futureProjection,
        recommendation,
        currentDifference: corporationAnalysis.netIncome - individualAnalysis.netIncome
    };
}

// 個人事業主の税務計算
function calculateIndividualBusiness(salary, businessIncome, businessExpenses, considerSocialInsurance) {
    const businessProfit = businessIncome - businessExpenses;
    
    // 給与所得控除
    const salaryDeduction = calculateSalaryDeduction(salary);
    const salaryTaxableIncome = Math.max(0, salary - salaryDeduction);
    
    // 事業所得（青色申告特別控除65万円を適用）
    const businessTaxableIncome = Math.max(0, businessProfit - 650000);
    
    // 合計所得
    const totalTaxableIncome = salaryTaxableIncome + businessTaxableIncome;
    const adjustedTaxableIncome = Math.max(0, totalTaxableIncome - DEDUCTIONS.basic);
    
    // 税額計算
    const incomeTax = calculateIncomeTax(adjustedTaxableIncome);
    const residentTax = calculateResidentTax(totalTaxableIncome);
    
    // 個人事業税
    const businessTax = businessTaxableIncome > TAX_RATES.businessTax.deduction 
        ? (businessTaxableIncome - TAX_RATES.businessTax.deduction) * TAX_RATES.businessTax.rate 
        : 0;
    
    // 社会保険料（給与分）
    const socialInsurance = calculateSocialInsurance(salary);
    
    // 国民健康保険（事業所得分の概算）
    const healthInsuranceOnBusiness = considerSocialInsurance 
        ? Math.min(businessTaxableIncome * 0.1, 830000) // 上限83万円
        : 0;
    
    const totalTax = incomeTax + residentTax + businessTax + socialInsurance.total() + healthInsuranceOnBusiness;
    const netIncome = salary + businessProfit - totalTax;
    
    return {
        businessIncome: businessProfit,
        incomeTax,
        residentTax,
        businessTax,
        healthInsurance: healthInsuranceOnBusiness,
        socialInsurance: socialInsurance.total(),
        totalTax,
        netIncome
    };
}

// 法人の税務計算
function calculateCorporation(businessIncome, businessExpenses, desiredSalary, corporationCosts, considerSocialInsurance) {
    const businessProfit = businessIncome - businessExpenses;
    
    // 役員報酬を経費として控除
    const corporateTaxableIncome = Math.max(0, businessProfit - desiredSalary);
    
    // 法人税等の計算
    const corporationTax = corporateTaxableIncome <= 8000000
        ? corporateTaxableIncome * TAX_RATES.corporationTax.small
        : 8000000 * TAX_RATES.corporationTax.small + 
          (corporateTaxableIncome - 8000000) * TAX_RATES.corporationTax.large;
    
    const localTax = corporateTaxableIncome * TAX_RATES.corporationTax.localTax;
    const totalCorporationTax = corporationTax + localTax;
    
    // 役員報酬に対する個人税
    const salaryDeduction = calculateSalaryDeduction(desiredSalary);
    const salaryTaxableIncome = Math.max(0, desiredSalary - salaryDeduction - DEDUCTIONS.basic);
    const personalIncomeTax = calculateIncomeTax(salaryTaxableIncome);
    const personalResidentTax = calculateResidentTax(Math.max(0, desiredSalary - salaryDeduction));
    
    // 社会保険料（役員報酬分）
    const socialInsurance = calculateSocialInsurance(desiredSalary);
    
    // 法人化費用（年割り：3年で償却）
    const annualSetupCost = corporationCosts / 3;
    
    const totalPersonalTax = personalIncomeTax + personalResidentTax + socialInsurance.total();
    const netCorporateIncome = businessProfit - desiredSalary - totalCorporationTax - annualSetupCost;
    const netPersonalIncome = desiredSalary - totalPersonalTax;
    const totalNetIncome = netCorporateIncome + netPersonalIncome;
    
    return {
        corporateTaxableIncome,
        corporationTax: totalCorporationTax,
        personalTax: personalIncomeTax + personalResidentTax,
        socialInsurance: socialInsurance.total(),
        setupCost: annualSetupCost,
        salary: desiredSalary,
        netCorporateIncome,
        netPersonalIncome,
        netIncome: totalNetIncome
    };
}

// 分岐点計算
function calculateBreakEvenPoint(salary, businessExpenses, corporationCosts, expectedGrowth) {
    // 様々な事業収入レベルで個人と法人を比較
    const incomePoints = [];
    for (let income = 1000000; income <= 20000000; income += 500000) {
        const individual = calculateIndividualBusiness(salary, income, businessExpenses, true);
        const corporation = calculateCorporation(income, businessExpenses, salary * 0.8, corporationCosts, true);
        
        incomePoints.push({
            income,
            individualNet: individual.netIncome,
            corporationNet: corporation.netIncome,
            difference: corporation.netIncome - individual.netIncome
        });
    }
    
    // 分岐点を見つける
    let breakEvenIncome = null;
    for (let i = 0; i < incomePoints.length - 1; i++) {
        if (incomePoints[i].difference <= 0 && incomePoints[i + 1].difference > 0) {
            breakEvenIncome = incomePoints[i + 1].income;
            break;
        }
    }
    
    return {
        breakEvenIncome: breakEvenIncome || 10000000, // デフォルト1000万円
        incomePoints
    };
}

// 将来予測計算
function calculateFutureProjection(currentIncome, growthRate, breakEvenPoint, years) {
    const projections = [];
    let income = currentIncome;
    
    for (let year = 1; year <= years; year++) {
        income = income * (1 + growthRate / 100);
        
        const isAboveBreakEven = income >= breakEvenPoint.breakEvenIncome;
        const recommendation = isAboveBreakEven ? "法人化推奨" : "個人事業主継続";
        
        projections.push({
            year,
            projectedIncome: income,
            isAboveBreakEven,
            recommendation,
            potentialSavings: isAboveBreakEven ? income * 0.05 : 0 // 概算節税額
        });
    }
    
    return projections;
}

// 法人化推奨判定
function generateIncorporationRecommendation(individual, corporation, breakEvenPoint, currentIncome) {
    const currentDifference = corporation.netIncome - individual.netIncome;
    const isCurrentlyBeneficial = currentDifference > 0;
    const isAboveBreakEven = currentIncome >= breakEvenPoint.breakEvenIncome;
    
    let recommendation = "";
    let reasoning = [];
    let actionItems = [];
    
    if (isCurrentlyBeneficial && isAboveBreakEven) {
        recommendation = "🚀 法人化を強く推奨します";
        reasoning.push(`現在の事業収入（${formatCurrency(currentIncome)}）では法人化により年間${formatCurrency(currentDifference)}の節税効果があります`);
        reasoning.push(`分岐点（${formatCurrency(breakEvenPoint.breakEvenIncome)}）を上回っており、継続的なメリットが期待できます`);
        
        actionItems.push("1. 司法書士・税理士への相談");
        actionItems.push("2. 法人設立の準備（定款作成等）");
        actionItems.push("3. 法人口座開設の手続き");
        actionItems.push("4. 会計ソフトの導入検討");
    } else if (!isCurrentlyBeneficial && isAboveBreakEven) {
        recommendation = "⚠️ 法人化の検討時期です";
        reasoning.push(`現在は個人事業主の方が${formatCurrency(Math.abs(currentDifference))}有利ですが、分岐点に近づいています`);
        reasoning.push("事業の成長に合わせて法人化を検討することをお勧めします");
        
        actionItems.push("1. 四半期ごとの収益状況をモニタリング");
        actionItems.push("2. 法人化の準備資料を整備");
        actionItems.push("3. 税理士への事前相談");
    } else {
        recommendation = "📊 現在は個人事業主が有利です";
        reasoning.push(`現在の事業収入では個人事業主の方が年間${formatCurrency(Math.abs(currentDifference))}有利です`);
        reasoning.push(`分岐点（${formatCurrency(breakEvenPoint.breakEvenIncome)}）到達時に再検討をお勧めします`);
        
        actionItems.push("1. 事業拡大に注力");
        actionItems.push("2. 青色申告の活用");
        actionItems.push("3. 経費管理の最適化");
        actionItems.push("4. 定期的な損益状況の確認");
    }
    
    return {
        recommendation,
        reasoning,
        actionItems,
        isCurrentlyBeneficial,
        isAboveBreakEven
    };
}

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

// フォーム送信処理とイベントリスナー
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

    // 法人化分析フォーム処理
    const incorporationForm = document.getElementById('incorporationForm');
    if (incorporationForm) {
        incorporationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 入力値の取得
            const salary = parseInt(document.getElementById('incSalary').value) || 0;
            const businessIncome = parseInt(document.getElementById('incBusinessIncome').value) || 0;
            const businessExpenses = parseInt(document.getElementById('incBusinessExpenses').value) || 0;
            const expectedGrowth = parseInt(document.getElementById('incExpectedGrowth').value) || 0;
            const desiredSalary = parseInt(document.getElementById('incDesiredSalary').value) || salary;
            const corporationCosts = parseInt(document.getElementById('incCorporationCosts').value) || 300000;
            const considerSocialInsurance = document.getElementById('incConsiderSocialInsurance').checked;
            const considerRetirement = document.getElementById('incConsiderRetirement').checked;
            
            // バリデーション
            if (businessIncome <= 0) {
                alert('事業収入を入力してください');
                return;
            }
            
            if (businessExpenses > businessIncome) {
                alert('事業経費は事業収入以下で入力してください');
                return;
            }
            
            if (expectedGrowth < 0 || expectedGrowth > 100) {
                alert('成長率は0-100%の範囲で入力してください');
                return;
            }
            
            // 法人化分析実行
            const analysisData = {
                salary,
                businessIncome,
                businessExpenses,
                expectedGrowth,
                desiredSalary,
                corporationCosts,
                considerSocialInsurance,
                considerRetirement
            };
            
            const analysisResult = calculateIncorporationAnalysis(analysisData);
            
            // 結果表示
            updateIncorporationDisplay(analysisResult);
            
            // 結果セクション表示
            document.getElementById('incorporationResults').style.display = 'block';
            document.getElementById('incorporationResults').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// 法人化分析結果表示更新
function updateIncorporationDisplay(result) {
    // サマリー表示
    document.getElementById('incorporationRecommendation').textContent = result.recommendation.recommendation;
    document.getElementById('incorporationBreakeven').textContent = 
        `分岐点: ${formatCurrency(result.breakEvenPoint.breakEvenIncome)} | 現在の差額: ${formatCurrency(result.currentDifference)}`;
    
    // 個人事業主データ
    document.getElementById('indBusinessIncome').textContent = formatCurrency(result.individual.businessIncome);
    document.getElementById('indIncomeTax').textContent = formatCurrency(result.individual.incomeTax);
    document.getElementById('indResidentTax').textContent = formatCurrency(result.individual.residentTax);
    document.getElementById('indBusinessTax').textContent = formatCurrency(result.individual.businessTax);
    document.getElementById('indHealthInsurance').textContent = formatCurrency(result.individual.healthInsurance);
    document.getElementById('indNetIncome').textContent = formatCurrency(result.individual.netIncome);
    
    // 法人データ
    document.getElementById('corpSalary').textContent = formatCurrency(result.corporation.salary);
    document.getElementById('corpTax').textContent = formatCurrency(result.corporation.corporationTax);
    document.getElementById('corpPersonalTax').textContent = formatCurrency(result.corporation.personalTax);
    document.getElementById('corpSocialInsurance').textContent = formatCurrency(result.corporation.socialInsurance);
    document.getElementById('corpSetupCost').textContent = formatCurrency(result.corporation.setupCost);
    document.getElementById('corpNetIncome').textContent = formatCurrency(result.corporation.netIncome);
    
    // 分岐点チャート表示
    updateBreakEvenChart(result.breakEvenPoint);
    
    // 将来予測表示
    updateFutureProjection(result.futureProjection);
    
    // 行動計画表示
    updateActionPlan(result.recommendation);
}

// 分岐点チャート表示
function updateBreakEvenChart(breakEvenData) {
    const chartContainer = document.getElementById('breakEvenChart');
    const points = breakEvenData.incomePoints.filter((_, i) => i % 4 === 0); // 表示間隔調整
    
    chartContainer.innerHTML = `
        <div class="space-y-2">
            <div class="text-sm text-gray-600 mb-4">
                <span class="inline-block w-4 h-4 bg-blue-500 rounded mr-2"></span>個人事業主
                <span class="inline-block w-4 h-4 bg-purple-500 rounded mr-2 ml-4"></span>法人
                <span class="ml-4 font-semibold">分岐点: ${formatCurrency(breakEvenData.breakEvenIncome)}</span>
            </div>
            ${points.map(point => {
                const maxIncome = Math.max(point.individualNet, point.corporationNet);
                const individualWidth = (point.individualNet / maxIncome) * 100;
                const corporationWidth = (point.corporationNet / maxIncome) * 100;
                const isBreakEven = point.income >= breakEvenData.breakEvenIncome;
                
                return `
                    <div class="border-l-4 ${isBreakEven ? 'border-green-500' : 'border-gray-300'} pl-4 py-2">
                        <div class="text-sm font-medium">${formatCurrency(point.income)}</div>
                        <div class="mt-1 space-y-1">
                            <div class="flex items-center">
                                <span class="w-16 text-xs">個人:</span>
                                <div class="flex-1 bg-gray-200 rounded h-4 mx-2">
                                    <div class="bg-blue-500 h-4 rounded" style="width: ${individualWidth}%"></div>
                                </div>
                                <span class="text-xs w-20">${formatCurrency(point.individualNet)}</span>
                            </div>
                            <div class="flex items-center">
                                <span class="w-16 text-xs">法人:</span>
                                <div class="flex-1 bg-gray-200 rounded h-4 mx-2">
                                    <div class="bg-purple-500 h-4 rounded" style="width: ${corporationWidth}%"></div>
                                </div>
                                <span class="text-xs w-20">${formatCurrency(point.corporationNet)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// 将来予測表示
function updateFutureProjection(projections) {
    const projectionContainer = document.getElementById('futureProjection');
    
    projectionContainer.innerHTML = `
        <div class="space-y-3">
            ${projections.map(proj => `
                <div class="flex items-center justify-between p-3 rounded-lg ${proj.isAboveBreakEven ? 'bg-green-50' : 'bg-gray-50'}">
                    <div>
                        <span class="font-semibold">${proj.year}年後</span>
                        <span class="text-gray-600 ml-2">予想収入: ${formatCurrency(proj.projectedIncome)}</span>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold ${proj.isAboveBreakEven ? 'text-green-600' : 'text-gray-600'}">
                            ${proj.recommendation}
                        </div>
                        ${proj.potentialSavings > 0 ? `<div class="text-sm text-green-600">予想節税: ${formatCurrency(proj.potentialSavings)}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 行動計画表示
function updateActionPlan(recommendation) {
    const actionPlanContainer = document.getElementById('actionPlan');
    
    actionPlanContainer.innerHTML = `
        <div class="space-y-4">
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-800">判定理由</h4>
                ${recommendation.reasoning.map(reason => 
                    `<p class="text-gray-700">• ${reason}</p>`
                ).join('')}
            </div>
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-800">推奨アクション</h4>
                ${recommendation.actionItems.map(action => 
                    `<p class="text-gray-700">${action}</p>`
                ).join('')}
            </div>
        </div>
    `;
}

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