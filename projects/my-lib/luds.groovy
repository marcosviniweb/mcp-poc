/**
 *
 * Este arquivo é parte do projeto core-3rdparty community DevSecOps
 *
 * @package core-3rdparty
 * @name luds.groovy
 * @version 1.0.0
 * @description Módulo para a verificação da existência do design system luds
 * @author adler.santos <adler.santos@experian.com> marcosvinicius.ribeiro <marcosvinicius.ribeiro@experian.com>
 * @copyright 2025 © Serasa Experian
 *
 * */

import groovy.json.JsonSlurperClassic
import groovy.json.JsonBuilder
import hudson.model.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import jenkins.model.*

/*
* Variaveis globais
*/

luminaData = [:]

/*
* Métodos
*/

def setMapLuminaUsage() {
    utilsMessageLib.infoMsg(">>> Verificando utilização do Lumina...")

    // 1. Verificar se Lumina está instalado
    def luminaInstalled = checkLuminaInstallation()
    luminaData.lumina_setup = luminaInstalled
    luminaData.analysis_date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"))
    luminaData.gearr_id = getGearrId()

    if (luminaInstalled) {
        utilsMessageLib.infoMsg(">>> Lumina está instalado.")
        // 2. Obter versão
        luminaData.lumina_version = getLuminaVersion()

        // 3. Coletar imports dinamicamente
        def imports = collectLuminaImports()
        luminaData.lumina_usage = imports

        // 4. Calcular métricas
        //luminaData.usage_metrics = calculateUsageMetrics(imports)

        // 5. Converter para JSON
        def jsonBuilder = new JsonBuilder(luminaData)
        def luminaDataJson = jsonBuilder.toPrettyString()
        
        //sendLuminaDataToApi(luminaData)
        utilsMessageLib.infoMsg(">>> Lumina Data JSON: ${luminaDataJson}")
    } else {
        utilsMessageLib.warnMsg(">>> Lumina não está instalado no projeto.")
        luminaData.lumina_setup = false
    }
}

def checkLuminaInstallation() {
    // Verificar se Lumina está instalado
    def result = sh(
        script: 'cat package.json | grep "@luds/ui" > /dev/null',
        returnStatus: true
    )
    return result == 0  // Returns true if grep found the pattern (exit code 0)
}

def getGearrId() {
    // Obter versão do Lumina
    def result = sh(
        script: 'cat piaas.yml | grep "gearr:" | cut -d: -f2 | tr -d " "',
        returnStdout: true
    ).trim()
    return result
}

def getLuminaVersion() {
    // Obter versão do Lumina
    def result = sh(
        script: 'cat package-lock.json | grep -A 1 \'"node_modules/@luds/ui":\' | grep \'"version":\' | grep -oE \'[0-9]+\\.[0-9]+\\.[0-9]+\' | head -1',
        returnStdout: true
    ).trim()
    return result
}

def collectLuminaImports() {
    def imports = [
        blocks: [],
        components: [],
        themes: [],
    ]

    utilsMessageLib.infoMsg(">>> [DEBUG] Iniciando coleta de blocks...")
    
    // Abordagem 1: Tentar com sed multi-linha
    def blocksFound = sh(script: '''
        find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | while read -r file; do
            [ -f "$file" ] || continue
            cat "$file" | tr '\\n' ' ' | grep -oE 'import[[:space:]]*\\{[^}]+\\}[[:space:]]*from[[:space:]]*["'"'"']@luds/ui/blocks/[^"'"'"']+["'"'"']' | 
            sed 's/.*{//; s/}.*//' | 
            tr ',' '\\n' | 
            sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | 
            grep -E '^[A-Z]' | 
            grep -v '^$'
        done | sort | uniq
    ''', returnStdout: true).trim()

    if (blocksFound) {
        imports.blocks = blocksFound.split('\n').findAll { it.trim() }.collect { it.trim() }
        utilsMessageLib.infoMsg(">>> [DEBUG] Blocks encontrados: ${imports.blocks.size()} itens - ${imports.blocks.join(', ')}")
    } else {
        utilsMessageLib.warnMsg(">>> [DEBUG] Nenhum block encontrado!")
    }

    utilsMessageLib.infoMsg(">>> [DEBUG] Iniciando coleta de components...")
    
    // Abordagem 2: Mesma lógica para components
    def componentsFound = sh(script: '''
        find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | while read -r file; do
            [ -f "$file" ] || continue
            cat "$file" | tr '\\n' ' ' | grep -oE 'import[[:space:]]*\\{[^}]+\\}[[:space:]]*from[[:space:]]*["'"'"']@luds/ui/components/[^"'"'"']+["'"'"']' | 
            sed 's/.*{//; s/}.*//' | 
            tr ',' '\\n' | 
            sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | 
            grep -E '^[A-Z]' | 
            grep -v '^$'
        done | sort | uniq
    ''', returnStdout: true).trim()

    if (componentsFound) {
        imports.components = componentsFound.split('\n').findAll { it.trim() }.collect { it.trim() }
        utilsMessageLib.infoMsg(">>> [DEBUG] Components encontrados: ${imports.components.size()} itens - ${imports.components.join(', ')}")
    } else {
        utilsMessageLib.warnMsg(">>> [DEBUG] Nenhum component encontrado!")
    }

    utilsMessageLib.infoMsg(">>> [DEBUG] Iniciando coleta de themes...")
    
    // Coletar temas
    def themesFound = sh(script: '''
        find . -name "*.scss" -o -name "*.sass" -o -name "*.css" 2>/dev/null | while read -r file; do
            [ -f "$file" ] || continue
            grep -oE '@use[[:space:]]*["'"'"']@luds/ui/styles/themes/[^"'"'"']+' "$file" 2>/dev/null | 
            sed 's/.*themes\\///' | 
            sed 's/["'"'"'].*//'
        done | sort | uniq
    ''', returnStdout: true).trim()

    if (themesFound) {
        imports.themes = themesFound.split('\n').findAll { it.trim() }.collect { it.trim() }
        utilsMessageLib.infoMsg(">>> [DEBUG] Themes encontrados: ${imports.themes.size()} itens - ${imports.themes.join(', ')}")
    } else {
        utilsMessageLib.warnMsg(">>> [DEBUG] Nenhum theme encontrado!")
    }

    // Coletar classes utilitárias (não necessário no momento)
    // def utilityClassesFound = sh(script: '''
    //     find . \\( -name "*.html" -o -name "*.ts" \\) -print0 2>/dev/null | xargs -0 -r grep -ho "class=['\\\"][^'\\\"]*luds-[a-zA-Z0-9-_]*[^'\\\"]*['\\\"]" 2>/dev/null |
    //     grep -o "luds-[a-zA-Z0-9-_]*" | grep -v "^\\$" | sort | uniq
    // ''', returnStdout: true).trim()

    // if (utilityClassesFound) {
    //     imports.utility_classes = utilityClassesFound.split('\n').findAll { it.trim() }
    // }

    return imports
}

/*
* Métodos de controle de fluxo por stages
*/

/**
* before_build
* Método controla o fluxo de execução para o stage de before_build
**/
def before_build(String cmd) {
    utilsMessageLib.infoMsg("Olá! Esse é um archetype inicial para criação de módulos 3rd Party!")
    utilsMessageLib.infoMsg("Os argumentos recebidos foram: ${cmd}")

    setMapLuminaUsage()

    utilsMessageLib.infoMsg("Esse módulo base foi executado conforme esperado!")
}

return this
